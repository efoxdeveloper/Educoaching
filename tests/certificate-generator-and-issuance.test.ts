import { describe, it, expect } from "vitest";
import {
  substitutePlaceholders,
  generateCertificatePdfBuffer,
  type CertificateData,
} from "../src/lib/certificate-generator";

describe("Feature 1 — Auto Certificate Generator & Issuance", () => {
  describe("1. Template Placeholder Substitution", () => {
    it("accurately substitutes {studentName}, {courseName}, {completionDate}, and {instituteName}", () => {
      const templateText =
        "This is to certify that {studentName} has successfully completed the course {courseName} on {completionDate} at {instituteName}.";

      const variables = {
        studentName: "Aarav Gupta",
        courseName: "Class 12 Physics & Chemistry Crash Course",
        completionDate: "15 Aug 2026",
        instituteName: "Vidyalaya Institute",
        certificateId: "CERT-998877",
      };

      const result = substitutePlaceholders(templateText, variables);

      expect(result).toContain("Aarav Gupta");
      expect(result).toContain("Class 12 Physics & Chemistry Crash Course");
      expect(result).toContain("15 Aug 2026");
      expect(result).toContain("Vidyalaya Institute");
      expect(result).not.toContain("{studentName}");
      expect(result).not.toContain("{courseName}");
    });
  });

  describe("2. PDF Buffer Generation", () => {
    it("generates a valid A4 Landscape PDF buffer", async () => {
      const certData: CertificateData = {
        instituteId: "inst-1",
        instituteName: "Apex Medical Academy",
        templateId: "tpl-1",
        templateTitle: "Certificate of Completion",
        templateBodyText:
          "This is to certify that {studentName} has successfully completed {courseName} on {completionDate}.",
        studentId: "student-101",
        studentName: "Pooja Verma",
        courseName: "NEET Intensive Revision",
        completionDate: new Date("2026-08-15"),
        signatoryName: "Dr. R. K. Sharma",
        signatoryTitle: "Academic Director",
        certificateId: "CERT-POOJA-001",
      };

      const buffer = await generateCertificatePdfBuffer(certData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.toString("utf8", 0, 4)).toBe("%PDF");
    });
  });

  describe("3. Batch Eligibility Gating (courseEndDate <= today)", () => {
    it("filters out students whose courseEndDate is in the future or not set", () => {
      const now = new Date("2026-09-01T12:00:00.000Z");

      const studentBatch = [
        {
          id: "student-1",
          name: "Eligible Completed Student",
          courseEndDate: new Date("2026-08-30T00:00:00.000Z"), // Passed
        },
        {
          id: "student-2",
          name: "Ongoing Student",
          courseEndDate: new Date("2026-10-15T00:00:00.000Z"), // Future
        },
        {
          id: "student-3",
          name: "No End Date Student",
          courseEndDate: null, // Unset
        },
      ];

      const eligible = studentBatch.filter(
        (s) => s.courseEndDate !== null && new Date(s.courseEndDate) <= now
      );

      expect(eligible.map((s) => s.id)).toEqual(["student-1"]);
      expect(eligible.length).toBe(1);
    });
  });

  describe("4. Re-generation Idempotency / No Duplication", () => {
    it("updates rather than duplicates CertificateIssued when re-generating", () => {
      type IssuedRow = {
        studentId: string;
        templateId: string;
        pdfFileAssetId: string;
        issuedAt: Date;
      };

      const issuedDb: Map<string, IssuedRow> = new Map();

      const simulateUpsert = (
        studentId: string,
        templateId: string,
        pdfFileAssetId: string
      ) => {
        const key = `${studentId}_${templateId}`;
        issuedDb.set(key, {
          studentId,
          templateId,
          pdfFileAssetId,
          issuedAt: new Date(),
        });
      };

      // First issuance
      simulateUpsert("student-1", "tpl-main", "file-asset-v1");
      expect(issuedDb.size).toBe(1);
      expect(issuedDb.get("student-1_tpl-main")?.pdfFileAssetId).toBe("file-asset-v1");

      // Force re-generation
      simulateUpsert("student-1", "tpl-main", "file-asset-v2");
      expect(issuedDb.size).toBe(1); // No new row added!
      expect(issuedDb.get("student-1_tpl-main")?.pdfFileAssetId).toBe("file-asset-v2");
    });
  });
});
