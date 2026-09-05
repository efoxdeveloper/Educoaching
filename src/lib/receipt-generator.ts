import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, buildStorageKey } from "@/lib/storage";
import { parseInstituteSettings } from "@/lib/institute-settings";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface ReceiptData {
  instituteId: string;
  paymentId: string;
  studentName: string;
  studentMobile: string;
  courseName?: string;
  batchName?: string;
  amount: number;
  baseAmount?: number | null;
  gstAmount?: number | null;
  gstPercent?: number | null;
  paymentMethod: string;
  paidAt: Date;
  installmentTitle?: string | null;
  installmentNumber?: number | null;
  isRefund?: boolean;
  refundReason?: string | null;
  remainingBalance?: number;
  totalFee?: number;
}

/**
 * Generates a standard, crisp PDF receipt buffer.
 */
export async function generateReceiptPdfBuffer(data: ReceiptData, instituteInfo: {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  mobile?: string | null;
  email?: string | null;
  guidePhone?: string | null;
  taxNumber?: string | null;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err: Error) => reject(err));

      const isRefund = Boolean(data.isRefund);
      const primaryColor = isRefund ? "#991B1B" : "#1E3A8A"; // Red for refund, Indigo for payment
      const accentColor = isRefund ? "#FEF2F2" : "#F0F4FF";

      // Top Header Banner
      doc.rect(40, 40, 515, 75).fill(accentColor);

      // Institute Name & Title
      doc
        .fillColor(primaryColor)
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(instituteInfo.name, 55, 52, { width: 330 });

      const addressParts = [instituteInfo.address, instituteInfo.city, instituteInfo.state].filter(Boolean);
      doc
        .fillColor("#4B5563")
        .fontSize(9)
        .font("Helvetica")
        .text(addressParts.join(", ") || "Main Branch", 55, 76, { width: 330 });

      const contactParts = [
        instituteInfo.mobile ? `Tel: ${instituteInfo.mobile}` : null,
        instituteInfo.email ? `Email: ${instituteInfo.email}` : null,
      ].filter(Boolean);
      doc.text(contactParts.join(" | "), 55, 90, { width: 330 });

      // Receipt Label & Number
      doc
        .fillColor(primaryColor)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(isRefund ? "REFUND RECEIPT" : "FEE PAYMENT RECEIPT", 380, 52, { align: "right", width: 160 });

      doc
        .fillColor("#374151")
        .fontSize(8.5)
        .font("Helvetica")
        .text(`Receipt #: ${data.paymentId.slice(-8).toUpperCase()}`, 380, 72, { align: "right", width: 160 })
        .text(`Date: ${formatDate(data.paidAt)}`, 380, 85, { align: "right", width: 160 });

      if (instituteInfo.taxNumber) {
        doc.text(`GSTIN: ${instituteInfo.taxNumber}`, 380, 98, { align: "right", width: 160 });
      }

      // Student Details Section
      doc.y = 135;
      doc.rect(40, doc.y, 515, 65).strokeColor("#E5E7EB").stroke();

      const studentBoxY = doc.y + 10;
      doc
        .fillColor("#111827")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("STUDENT DETAILS", 55, studentBoxY);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#4B5563")
        .text(`Student Name: `, 55, studentBoxY + 16)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(data.studentName, 130, studentBoxY + 16)
        .font("Helvetica")
        .fillColor("#4B5563")
        .text(`Mobile: `, 55, studentBoxY + 30)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(data.studentMobile, 130, studentBoxY + 30);

      doc
        .font("Helvetica")
        .fillColor("#4B5563")
        .text(`Course: `, 320, studentBoxY + 16)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(data.courseName || "General Course", 380, studentBoxY + 16)
        .font("Helvetica")
        .fillColor("#4B5563")
        .text(`Batch: `, 320, studentBoxY + 30)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(data.batchName || "Standard", 380, studentBoxY + 30);

      // Payment Breakdown Table
      const tableTop = 220;
      doc.rect(40, tableTop, 515, 22).fill(primaryColor);

      doc
        .fillColor("#FFFFFF")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("ITEM / DESCRIPTION", 55, tableTop + 6)
        .text("MODE", 320, tableTop + 6)
        .text("AMOUNT (INR)", 430, tableTop + 6, { align: "right", width: 110 });

      let currentY = tableTop + 30;
      doc.fillColor("#1F2937").font("Helvetica").fontSize(9);

      const itemTitle = data.installmentTitle || (isRefund ? "Fee Refund Credit" : `Fee Payment ${data.installmentNumber ? `(Installment #${data.installmentNumber})` : ""}`);
      doc.text(itemTitle, 55, currentY);
      doc.text(data.paymentMethod || "Online", 320, currentY);
      doc.text(formatCurrency(Math.abs(data.amount)), 430, currentY, { align: "right", width: 110 });

      if (isRefund && data.refundReason) {
        currentY += 16;
        doc.fillColor("#6B7280").fontSize(8).text(`Reason: ${data.refundReason}`, 55, currentY);
        doc.fillColor("#1F2937").fontSize(9);
      }

      // GST Breakdown (if applicable)
      currentY += 28;
      doc.rect(40, currentY, 515, 0.5).strokeColor("#E5E7EB").stroke();
      currentY += 10;

      const gstPct = data.gstPercent ?? 18;
      if (data.gstAmount && Number(data.gstAmount) > 0) {
        const base = data.baseAmount ? Number(data.baseAmount) : Number(data.amount) / (1 + gstPct / 100);
        const gstVal = Number(data.gstAmount);

        doc.fillColor("#4B5563").text("Base Fee:", 320, currentY);
        doc.text(formatCurrency(base), 430, currentY, { align: "right", width: 110 });

        currentY += 15;
        doc.text(`GST (${gstPct}%):`, 320, currentY);
        doc.text(formatCurrency(gstVal), 430, currentY, { align: "right", width: 110 });

        currentY += 15;
      }

      // Total Line
      doc.rect(300, currentY, 255, 26).fill(accentColor);
      doc
        .fillColor(primaryColor)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(isRefund ? "TOTAL REFUNDED:" : "TOTAL AMOUNT PAID:", 310, currentY + 7)
        .text(formatCurrency(Math.abs(data.amount)), 430, currentY + 7, { align: "right", width: 115 });

      // Balance Summary Box
      if (!isRefund && data.remainingBalance !== undefined) {
        currentY += 40;
        doc.rect(40, currentY, 515, 32).fill("#F9FAFB");
        doc
          .fillColor("#374151")
          .fontSize(9)
          .font("Helvetica")
          .text(`Total Course Fee: ${formatCurrency(data.totalFee || 0)}`, 55, currentY + 10)
          .text(`Remaining Balance Due: ${formatCurrency(data.remainingBalance)}`, 320, currentY + 10, { align: "right", width: 220 });
      }

      // Footer Notes & Signature
      const footerY = 440;
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#6B7280")
        .text("Terms & Conditions:", 55, footerY)
        .text("1. Fees paid are subject to institutional policies and terms of admission.", 55, footerY + 12)
        .text("2. Please retain this computer-generated receipt for future accounting reference.", 55, footerY + 22)
        .text("3. This is an authentic system-generated receipt and requires no physical seal.", 55, footerY + 32);

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text("Authorized Signatory", 400, footerY + 30, { align: "right", width: 140 })
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#4B5563")
        .text(instituteInfo.name, 400, footerY + 42, { align: "right", width: 140 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates and stores receipt in FileAsset, returning fileId and storageKey.
 */
export async function createAndPersistPaymentReceipt(paymentId: string): Promise<{ fileId: string; storageKey: string } | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      institute: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          mobile: true,
          email: true,
          guidePhone: true,
          settings: true,
        },
      },
      student: {
        include: {
          course: { select: { name: true } },
          batch: { select: { name: true } },
        },
      },
    },
  });

  if (!payment) return null;

  const parsedSettings = parseInstituteSettings(payment.institute.settings);
  const taxNumber = parsedSettings.taxNumber || null;

  const totalFee = Number(payment.student.totalFee);
  const paidFee = Number(payment.student.paidFee);
  const remainingBalance = Math.max(0, totalFee - paidFee);

  const receiptData: ReceiptData = {
    instituteId: payment.instituteId,
    paymentId: payment.id,
    studentName: payment.student.name,
    studentMobile: payment.student.mobile,
    courseName: payment.student.course?.name,
    batchName: payment.student.batch?.name,
    amount: Number(payment.amount),
    baseAmount: payment.baseAmount ? Number(payment.baseAmount) : null,
    gstAmount: payment.gstAmount ? Number(payment.gstAmount) : null,
    gstPercent: payment.gstPercent ? Number(payment.gstPercent) : null,
    paymentMethod: payment.method,
    paidAt: payment.paidAt,
    installmentTitle: payment.installmentTitle,
    installmentNumber: payment.installmentNumber,
    isRefund: payment.isRefund,
    refundReason: payment.refundReason,
    remainingBalance,
    totalFee,
  };

  const pdfBuffer = await generateReceiptPdfBuffer(receiptData, {
    name: payment.institute.name,
    address: payment.institute.address,
    city: payment.institute.city,
    state: payment.institute.state,
    mobile: payment.institute.mobile,
    email: payment.institute.email,
    guidePhone: payment.institute.guidePhone,
    taxNumber,
  });

  const fileName = `Receipt-${payment.id.slice(-8).toUpperCase()}.pdf`;
  const storageKey = buildStorageKey(payment.instituteId, "PAYMENT_RECEIPT", fileName);

  await getStorageProvider().save(storageKey, pdfBuffer);

  const fileAsset = await prisma.fileAsset.create({
    data: {
      instituteId: payment.instituteId,
      category: "PAYMENT_RECEIPT",
      fileName,
      mimeType: "application/pdf",
      sizeBytes: pdfBuffer.length,
      storageKey,
      relatedType: "Payment",
      relatedId: payment.id,
    },
  });

  // Link receiptFileId on Payment
  await prisma.payment.update({
    where: { id: payment.id },
    data: { receiptFileId: fileAsset.id },
  });

  return { fileId: fileAsset.id, storageKey };
}
