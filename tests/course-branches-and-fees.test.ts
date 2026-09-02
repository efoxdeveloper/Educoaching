import { describe, it, expect } from "vitest";
import { CourseFeeType } from "@prisma/client";

describe("Course Detailed Management, Fee Structures, and Multi-Branch Allocation", () => {
  it("supports multiple fee models (Full Course / Monthly / Quarterly / Annual)", () => {
    expect(CourseFeeType.ONE_TIME).toBe("ONE_TIME");
    expect(CourseFeeType.MONTHLY).toBe("MONTHLY");
    expect(CourseFeeType.QUARTERLY).toBe("QUARTERLY");
    expect(CourseFeeType.ANNUAL).toBe("ANNUAL");

    const formatCourseFeeLabel = (amount: number, feeType: CourseFeeType) => {
      const formatted = `₹${amount.toLocaleString("en-IN")}`;
      if (feeType === "MONTHLY") return `${formatted} / month`;
      if (feeType === "QUARTERLY") return `${formatted} / quarter`;
      if (feeType === "ANNUAL") return `${formatted} / year`;
      return `${formatted} (Full Course)`;
    };

    expect(formatCourseFeeLabel(85000, "ONE_TIME")).toBe("₹85,000 (Full Course)");
    expect(formatCourseFeeLabel(4500, "MONTHLY")).toBe("₹4,500 / month");
    expect(formatCourseFeeLabel(12000, "QUARTERLY")).toBe("₹12,000 / quarter");
    expect(formatCourseFeeLabel(45000, "ANNUAL")).toBe("₹45,000 / year");
  });

  it("handles course branch allocation filtering correctly", () => {
    const branches = [
      { id: "b1", name: "Kota Main Campus", city: "Kota" },
      { id: "b2", name: "Jaipur Center", city: "Jaipur" },
      { id: "b3", name: "Delhi South Ext", city: "New Delhi" },
    ];

    const courses = [
      {
        id: "c1",
        name: "Class 10 Foundation",
        isAllBranches: true,
        branches: [],
      },
      {
        id: "c2",
        name: "NEET Super-30 Dropper",
        isAllBranches: false,
        branches: [{ id: "b1", name: "Kota Main Campus" }],
      },
      {
        id: "c3",
        name: "JEE Advanced Pinnacle",
        isAllBranches: false,
        branches: [
          { id: "b1", name: "Kota Main Campus" },
          { id: "b3", name: "Delhi South Ext" },
        ],
      },
    ];

    // Helper to check if a course is offered at a given branch
    const isCourseAvailableAtBranch = (course: (typeof courses)[0], branchId: string) => {
      if (course.isAllBranches) return true;
      return course.branches.some((b) => b.id === branchId);
    };

    // Class 10 Foundation is available in ALL branches
    expect(isCourseAvailableAtBranch(courses[0], "b1")).toBe(true);
    expect(isCourseAvailableAtBranch(courses[0], "b2")).toBe(true);
    expect(isCourseAvailableAtBranch(courses[0], "b3")).toBe(true);

    // NEET Super-30 is ONLY in Kota Main (b1), NOT in Jaipur (b2) or Delhi (b3)
    expect(isCourseAvailableAtBranch(courses[1], "b1")).toBe(true);
    expect(isCourseAvailableAtBranch(courses[1], "b2")).toBe(false);
    expect(isCourseAvailableAtBranch(courses[1], "b3")).toBe(false);

    // JEE Advanced is in Kota (b1) and Delhi (b3), but NOT in Jaipur (b2)
    expect(isCourseAvailableAtBranch(courses[2], "b1")).toBe(true);
    expect(isCourseAvailableAtBranch(courses[2], "b2")).toBe(false);
    expect(isCourseAvailableAtBranch(courses[2], "b3")).toBe(true);
  });
});
