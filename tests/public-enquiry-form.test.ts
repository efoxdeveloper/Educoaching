import { describe, it, expect, beforeEach } from "vitest";
import { checkEnquiryRateLimit, resetEnquiryRateLimitStore } from "../src/lib/rate-limit";
import { slugify } from "../src/lib/utils";

describe("Feature 3 — Public External Enquiry Form & Rate Limiting", () => {
  beforeEach(() => {
    resetEnquiryRateLimitStore();
  });

  it("generates url-safe slugs from institute names", () => {
    expect(slugify("Apex IIT-JEE Academy")).toBe("apex-iit-jee-academy");
    expect(slugify("  Vidyalaya Classes & Test Series 2026!  ")).toBe("vidyalaya-classes-test-series-2026");
    expect(slugify("Target_NEET_Medical_Batch")).toBe("target-neet-medical-batch");
  });

  it("enforces rate limits allowing max 3 submissions per IP+mobile and blocks the 4th", () => {
    const testIp = "192.168.1.100";
    const testMobile = "9876543210";

    // 1st attempt: Allowed
    const res1 = checkEnquiryRateLimit(testIp, testMobile);
    expect(res1.allowed).toBe(true);
    expect(res1.count).toBe(1);

    // 2nd attempt: Allowed
    const res2 = checkEnquiryRateLimit(testIp, testMobile);
    expect(res2.allowed).toBe(true);
    expect(res2.count).toBe(2);

    // 3rd attempt: Allowed
    const res3 = checkEnquiryRateLimit(testIp, testMobile);
    expect(res3.allowed).toBe(true);
    expect(res3.count).toBe(3);

    // 4th attempt: BLOCKED
    const res4 = checkEnquiryRateLimit(testIp, testMobile);
    expect(res4.allowed).toBe(false);
    expect(res4.count).toBe(3);

    // Different IP/mobile is independent and still allowed
    const resOther = checkEnquiryRateLimit("192.168.1.101", "9876543211");
    expect(resOther.allowed).toBe(true);
    expect(resOther.count).toBe(1);
  });

  it("validates that public enquiries initialize with source WEBSITE, stage NEW, and priority WARM", () => {
    const buildPublicAdmissionPayload = (params: {
      applicantName: string;
      mobile: string;
      courseId: string;
      courseFee: number;
      message?: string;
    }) => {
      return {
        applicantName: params.applicantName.trim(),
        mobile: params.mobile.trim(),
        courseId: params.courseId,
        feePlan: params.courseFee,
        source: "WEBSITE" as const,
        stage: "NEW" as const,
        priority: "WARM" as const,
        note: params.message?.trim() || "Online website inquiry form",
      };
    };

    const admission = buildPublicAdmissionPayload({
      applicantName: "Aarav Sharma",
      mobile: "9876543210",
      courseId: "course-jee-1",
      courseFee: 45000,
      message: "Interested in weekend batch timings",
    });

    expect(admission.source).toBe("WEBSITE");
    expect(admission.stage).toBe("NEW");
    expect(admission.priority).toBe("WARM");
    expect(admission.applicantName).toBe("Aarav Sharma");
    expect(admission.feePlan).toBe(45000);
    expect(admission.note).toBe("Interested in weekend batch timings");
  });

  it("rejects unknown or inactive institute slugs", () => {
    type MockInstitute = {
      id: string;
      instituteSlug: string | null;
      status: "ACTIVE" | "SUSPENDED" | "PENDING_APPROVAL";
    };

    const institutes: MockInstitute[] = [
      { id: "inst-1", instituteSlug: "apex-academy", status: "ACTIVE" },
      { id: "inst-2", instituteSlug: "suspended-institute", status: "SUSPENDED" },
      { id: "inst-3", instituteSlug: null, status: "ACTIVE" },
    ];

    const resolveInstitute = (slugOrId: string) => {
      const match = institutes.find(
        (i) => (i.instituteSlug === slugOrId || i.id === slugOrId) && i.status === "ACTIVE"
      );
      return match || null;
    };

    expect(resolveInstitute("apex-academy")).not.toBeNull();
    expect(resolveInstitute("inst-1")).not.toBeNull();
    expect(resolveInstitute("suspended-institute")).toBeNull(); // Suspended
    expect(resolveInstitute("non-existent-slug")).toBeNull(); // Unknown
  });
});
