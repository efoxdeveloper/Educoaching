import { describe, it, expect } from "vitest";
import { calculateCourseEndDate } from "../src/lib/course-duration";

describe("Faculty Batch Assignment: Branch & Timing Visibility", () => {
  it("formats batches with branch name and timing to eliminate confusion during assignment", () => {
    const batches = [
      {
        id: "b-1",
        name: "Morning Pinnacle A",
        timing: "7:00 AM - 9:00 AM",
        courseName: "IIT-JEE Advanced",
        branchName: "Kota Main Campus",
        isAllBranches: false,
      },
      {
        id: "b-2",
        name: "Morning Pinnacle A", // Same name, but different campus & timing!
        timing: "8:00 AM - 10:00 AM",
        courseName: "IIT-JEE Advanced",
        branchName: "Jaipur Center",
        isAllBranches: false,
      },
    ];

    const formatBatchOption = (b: typeof batches[0]) => {
      return `${b.name} (${b.timing}) • ${b.courseName} 📍 ${b.branchName}`;
    };

    const labelKota = formatBatchOption(batches[0]);
    const labelJaipur = formatBatchOption(batches[1]);

    expect(labelKota).toBe("Morning Pinnacle A (7:00 AM - 9:00 AM) • IIT-JEE Advanced 📍 Kota Main Campus");
    expect(labelJaipur).toBe("Morning Pinnacle A (8:00 AM - 10:00 AM) • IIT-JEE Advanced 📍 Jaipur Center");
    expect(labelKota).not.toBe(labelJaipur);
  });
});

describe("Course Commencement Date & Completion Calculation", () => {
  it("calculates expected completion date from start date and duration", () => {
    const startDate = new Date("2026-09-01");

    // 15 Days Crash Course
    const end15Days = calculateCourseEndDate(startDate, "15 Days");
    expect(end15Days.toISOString().slice(0, 10)).toBe("2026-09-16");

    // 6 Months Course
    const end6Months = calculateCourseEndDate(startDate, "6 Months");
    expect(end6Months.toISOString().slice(0, 10)).toBe("2027-03-01");

    // 1 Year 6 Months Course
    const end1Yr6Mo = calculateCourseEndDate(startDate, "1 Year 6 Months");
    expect(end1Yr6Mo.toISOString().slice(0, 10)).toBe("2028-03-01");
  });
});

describe("Batch Timing Changes (e.g. Winter Schedule Adjustments)", () => {
  it("allows updating batch timing while preserving branch allocations", () => {
    const batch = {
      id: "batch-101",
      name: "NEET Super 30 Morning",
      timing: "7:00 AM - 9:00 AM", // Summer timing
      branchIds: ["br-kota", "br-jaipur"],
      isAllBranches: false,
      capacity: 50,
      status: "Active",
    };

    // Winter schedule shift
    const updateBatchTiming = (
      existing: typeof batch,
      newTiming: string
    ) => ({
      ...existing,
      timing: newTiming,
    });

    const winterBatch = updateBatchTiming(batch, "8:30 AM - 10:30 AM (Winter Schedule)");

    expect(winterBatch.timing).toBe("8:30 AM - 10:30 AM (Winter Schedule)");
    expect(winterBatch.branchIds).toEqual(["br-kota", "br-jaipur"]);
    expect(winterBatch.status).toBe("Active");
  });
});

describe("Batch Completion, Expiry & Branch-Aware Enrollment Removal", () => {
  it("identifies expired batches based on status or completion date", () => {
    const isBatchExpired = (b: { status: string; endDate?: string | null }) => {
      if (b.status === "Completed" || b.status === "Expired" || b.status === "Closed") return true;
      if (b.endDate && new Date() > new Date(b.endDate)) return true;
      return false;
    };

    // Past completed batch
    expect(
      isBatchExpired({
        status: "Completed",
        endDate: "2026-01-01",
      })
    ).toBe(true);

    // Batch whose completion date passed in 2025
    expect(
      isBatchExpired({
        status: "Active",
        endDate: "2025-12-31",
      })
    ).toBe(true);

    // Future ongoing batch
    expect(
      isBatchExpired({
        status: "Active",
        endDate: "2027-06-30",
      })
    ).toBe(false);
  });

  it("removes expired/completed batches from student enrollment per branch", () => {
    const batches = [
      {
        id: "b-active-kota",
        name: "JEE Active Batch 2026-27",
        courseId: "c-jee",
        branchId: "br-kota",
        status: "Active",
        endDate: "2027-04-30",
      },
      {
        id: "b-expired-kota",
        name: "JEE Completed Batch 2025-26",
        courseId: "c-jee",
        branchId: "br-kota",
        status: "Completed",
        endDate: "2026-03-31", // Expired
      },
      {
        id: "b-active-jaipur",
        name: "JEE Active Batch Jaipur",
        courseId: "c-jee",
        branchId: "br-jaipur",
        status: "Active",
        endDate: "2027-04-30",
      },
    ];

    const getEnrollableBatchesForBranch = (
      courseId: string,
      studentBranchId: string
    ) => {
      return batches.filter((b) => {
        const isExpired =
          b.status === "Completed" ||
          b.status === "Expired" ||
          b.status === "Closed" ||
          (b.endDate && new Date() > new Date(b.endDate));
        if (isExpired) return false;

        const matchCourse = b.courseId === courseId;
        const matchBranch = b.branchId === studentBranchId;
        return matchCourse && matchBranch;
      });
    };

    // At Kota: only the active batch is available; expired batch is removed
    const enrollableKota = getEnrollableBatchesForBranch("c-jee", "br-kota");
    expect(enrollableKota.length).toBe(1);
    expect(enrollableKota[0].id).toBe("b-active-kota");

    // At Jaipur: only Jaipur's active batch
    const enrollableJaipur = getEnrollableBatchesForBranch("c-jee", "br-jaipur");
    expect(enrollableJaipur.length).toBe(1);
    expect(enrollableJaipur[0].id).toBe("b-active-jaipur");
  });
});
