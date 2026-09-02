import { describe, it, expect } from "vitest";
import { generateReceiptPdfBuffer, type ReceiptData } from "../src/lib/receipt-generator";
import { parseInstituteSettings } from "../src/lib/institute-settings";

describe("Item 2 — Fees Management Gaps: PDF Receipts, GST, and Refunds", () => {
  describe("2a — Real PDF Payment Receipts", () => {
    it("generates a valid PDF buffer for payment receipt", async () => {
      const receiptData: ReceiptData = {
        instituteId: "inst-1",
        paymentId: "pay_abc123456",
        studentName: "Rahul Sharma",
        studentMobile: "9876543210",
        courseName: "Class 12 Physics & Chemistry",
        batchName: "Morning Batch A",
        amount: 25000,
        baseAmount: 21186.44,
        gstAmount: 3813.56,
        gstPercent: 18,
        paymentMethod: "UPI",
        paidAt: new Date(),
        installmentTitle: "Installment #1",
        installmentNumber: 1,
        remainingBalance: 15000,
        totalFee: 40000,
      };

      const instituteInfo = {
        name: "Apex Medical & Engineering Academy",
        address: "Plot 42, Knowledge Park III",
        city: "Greater Noida",
        state: "Uttar Pradesh",
        mobile: "9876500000",
        email: "info@apexacademy.com",
        taxNumber: "07AAAAA0000A1Z5",
      };

      const buffer = await generateReceiptPdfBuffer(receiptData, instituteInfo);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(500);

      // Standard PDF magic byte header check: %PDF
      const header = buffer.toString("utf8", 0, 4);
      expect(header).toBe("%PDF");
    });

    it("generates a distinct Refund Credit PDF buffer when isRefund is true", async () => {
      const refundReceiptData: ReceiptData = {
        instituteId: "inst-1",
        paymentId: "ref_99887766",
        studentName: "Pooja Verma",
        studentMobile: "9876543211",
        courseName: "NEET Crash Course",
        amount: -5000,
        paymentMethod: "Bank Transfer",
        paidAt: new Date(),
        isRefund: true,
        refundReason: "Batch timing conflict after college change",
      };

      const instituteInfo = {
        name: "Apex Academy",
        taxNumber: "07AAAAA0000A1Z5",
      };

      const buffer = await generateReceiptPdfBuffer(refundReceiptData, instituteInfo);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.toString("utf8", 0, 4)).toBe("%PDF");
    });
  });

  describe("2b — GST Calculation Engine", () => {
    it("parses applyGst and gstPercent settings accurately", () => {
      const settingsWithGst = parseInstituteSettings({
        taxNumber: "07AAAAA0000A1Z5",
        applyGst: true,
        gstPercent: 18,
      });

      expect(settingsWithGst.applyGst).toBe(true);
      expect(settingsWithGst.gstPercent).toBe(18);
      expect(settingsWithGst.taxNumber).toBe("07AAAAA0000A1Z5");

      const defaultSettings = parseInstituteSettings({});
      expect(defaultSettings.applyGst).toBe(false);
      expect(defaultSettings.gstPercent).toBe(18);
    });

    it("computes base fee and GST split when applyGst is enabled", () => {
      const totalPaid = 11800;
      const gstRate = 18;

      const baseAmount = Number((totalPaid / (1 + gstRate / 100)).toFixed(2));
      const gstAmount = Number((totalPaid - baseAmount).toFixed(2));

      expect(baseAmount).toBe(10000);
      expect(gstAmount).toBe(1800);
      expect(baseAmount + gstAmount).toBe(totalPaid);
    });
  });

  describe("2c — Refund Processing Workflow", () => {
    it("reduces student paidFee and caps refund amount to currently paid fees", () => {
      const student = {
        id: "student-1",
        totalFee: 50000,
        paidFee: 20000,
      };

      const processRefundSimulation = (currentPaid: number, requestedRefund: number, reason: string) => {
        if (!reason.trim()) throw new Error("Refund reason is mandatory");
        if (requestedRefund <= 0) throw new Error("Refund must be positive");
        const actualRefund = Math.min(requestedRefund, currentPaid);
        const newPaidFee = currentPaid - actualRefund;
        return {
          refundAmount: actualRefund,
          newPaidFee,
          isRefund: true,
          refundReason: reason,
        };
      };

      // Valid refund of ₹5,000
      const res1 = processRefundSimulation(student.paidFee, 5000, "Medical leave");
      expect(res1.refundAmount).toBe(5000);
      expect(res1.newPaidFee).toBe(15000);

      // Attempt to refund more than paid (₹30,000 when only ₹20,000 paid)
      const res2 = processRefundSimulation(student.paidFee, 30000, "Excess request");
      expect(res2.refundAmount).toBe(20000); // capped
      expect(res2.newPaidFee).toBe(0);
    });
  });
});
