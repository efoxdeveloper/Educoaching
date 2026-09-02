import { describe, it, expect } from "vitest";

describe("Multi-Branch Batch Allocation (Shared Course & Timing Across Campuses)", () => {
  const branches = [
    { id: "br-kota", name: "Kota Main Campus", city: "Kota" },
    { id: "br-jaipur", name: "Jaipur Center", city: "Jaipur" },
    { id: "br-delhi", name: "Delhi South Ext", city: "Delhi" },
  ];

  const course = {
    id: "c-neet-adv",
    name: "NEET Super 30 Intensive",
    fee: 95000,
  };

  it("supports allocating a single batch to multiple branches with identical timing", () => {
    // A shared batch across Kota and Jaipur with 7:00 AM - 9:00 AM timing
    const sharedBatch = {
      id: "batch-shared-1",
      name: "NEET Morning Pinnacle Batch",
      courseId: course.id,
      timing: "7:00 AM - 9:00 AM",
      capacity: 60,
      isAllBranches: false,
      branchId: "br-kota", // Primary branch
      branches: [branches[0], branches[1]], // Allocated to Kota AND Jaipur
    };

    expect(sharedBatch.branches.length).toBe(2);
    expect(sharedBatch.branches.map((b) => b.id)).toEqual(["br-kota", "br-jaipur"]);

    // Helper for matching batch availability for a student enrolling at a specific branch
    const isBatchAvailableForBranch = (batch: typeof sharedBatch, studentBranchId: string | null) => {
      if (!studentBranchId) return true;
      if (batch.isAllBranches) return true;
      if (batch.branchId === studentBranchId) return true;
      if (batch.branches.some((b) => b.id === studentBranchId)) return true;
      return false;
    };

    // Student at Kota should see this batch
    expect(isBatchAvailableForBranch(sharedBatch, "br-jaipur")).toBe(true);
    // Student at Jaipur should see this batch
    expect(isBatchAvailableForBranch(sharedBatch, "br-kota")).toBe(true);
    // Student at Delhi should NOT see this batch
    expect(isBatchAvailableForBranch(sharedBatch, "br-delhi")).toBe(false);
  });

  it("supports batches allocated to all branches (Central Hybrid Program)", () => {
    const centralBatch = {
      id: "batch-hybrid-all",
      name: "Central Online & Hybrid JEE Batch",
      courseId: course.id,
      timing: "6:00 PM - 8:00 PM",
      capacity: 200,
      isAllBranches: true,
      branchId: null,
      branches: [],
    };

    const isBatchAvailableForBranch = (batch: typeof centralBatch, studentBranchId: string | null) => {
      if (!studentBranchId) return true;
      if (batch.isAllBranches) return true;
      if (batch.branchId === studentBranchId) return true;
      if (batch.branches.some((b: any) => b.id === studentBranchId)) return true;
      return false;
    };

    expect(isBatchAvailableForBranch(centralBatch, "br-kota")).toBe(true);
    expect(isBatchAvailableForBranch(centralBatch, "br-jaipur")).toBe(true);
    expect(isBatchAvailableForBranch(centralBatch, "br-delhi")).toBe(true);
  });
});

describe("Multi-Branch Faculty Allocation (Morning at Branch A, Evening at Branch B)", () => {
  const branches = [
    { id: "br-kota", name: "Kota Main Campus" },
    { id: "br-jaipur", name: "Jaipur Center" },
    { id: "br-delhi", name: "Delhi South Ext" },
  ];

  it("allocates a famous faculty member across multiple branches", () => {
    // Star faculty teaching morning at Kota and evening at Jaipur
    const starFaculty = {
      id: "fac-hc-verma",
      name: "Prof. H. C. Verma",
      designation: "Head of Physics",
      isAllBranches: false,
      branchId: "br-kota",
      branches: [branches[0], branches[1]], // Kota & Jaipur
      timetableSlots: [
        { branchId: "br-kota", timing: "8:00 AM - 10:00 AM", slotName: "Morning Lecture" },
        { branchId: "br-jaipur", timing: "4:00 PM - 6:00 PM", slotName: "Evening Lecture" },
      ],
    };

    expect(starFaculty.branches.length).toBe(2);

    // Filter faculty by branch
    const matchesBranchFilter = (faculty: typeof starFaculty, filterBranchId: string) => {
      if (filterBranchId === "ALL") return true;
      if (faculty.isAllBranches) return true;
      if (faculty.branchId === filterBranchId) return true;
      return faculty.branches.some((b) => b.id === filterBranchId);
    };

    expect(matchesBranchFilter(starFaculty, "br-kota")).toBe(true);
    expect(matchesBranchFilter(starFaculty, "br-jaipur")).toBe(true);
    expect(matchesBranchFilter(starFaculty, "br-delhi")).toBe(false);
  });

  it("supports visiting star faculty allocated to all campuses", () => {
    const celebrityFaculty = {
      id: "fac-star-guest",
      name: "Dr. K. N. Sharma",
      designation: "Chief Academic Director",
      isAllBranches: true,
      branchId: null,
      branches: [],
    };

    const matchesBranchFilter = (faculty: typeof celebrityFaculty, filterBranchId: string) => {
      if (filterBranchId === "ALL") return true;
      if (faculty.isAllBranches) return true;
      if (faculty.branchId === filterBranchId) return true;
      return faculty.branches.some((b: any) => b.id === filterBranchId);
    };

    expect(matchesBranchFilter(celebrityFaculty, "br-kota")).toBe(true);
    expect(matchesBranchFilter(celebrityFaculty, "br-jaipur")).toBe(true);
    expect(matchesBranchFilter(celebrityFaculty, "br-delhi")).toBe(true);
  });
});

describe("Multi-Subject Faculty Allocation (One Teacher Teaching Multiple Subjects)", () => {
  it("stores and formats multiple subjects for polymath teachers", () => {
    const multiSubjectTeacher = {
      id: "fac-polymath",
      name: "Anand Kumar",
      subjects: ["Physics", "Mathematics", "Applied Statistics"],
      subject: "Physics, Mathematics, Applied Statistics", // Backwards compatible formatted string
    };

    expect(multiSubjectTeacher.subjects).toHaveLength(3);
    expect(multiSubjectTeacher.subjects).toContain("Physics");
    expect(multiSubjectTeacher.subjects).toContain("Mathematics");
    expect(multiSubjectTeacher.subjects).toContain("Applied Statistics");
    expect(multiSubjectTeacher.subject).toBe("Physics, Mathematics, Applied Statistics");

    // Search teacher by any of their subjects
    const teachesSubject = (teacher: typeof multiSubjectTeacher, query: string) => {
      const q = query.toLowerCase().trim();
      return (
        teacher.subjects.some((s) => s.toLowerCase().includes(q)) ||
        (teacher.subject ?? "").toLowerCase().includes(q)
      );
    };

    expect(teachesSubject(multiSubjectTeacher, "physics")).toBe(true);
    expect(teachesSubject(multiSubjectTeacher, "math")).toBe(true);
    expect(teachesSubject(multiSubjectTeacher, "statistics")).toBe(true);
    expect(teachesSubject(multiSubjectTeacher, "chemistry")).toBe(false);
  });

  it("parses comma-separated legacy subjects into structured arrays", () => {
    const parseSubjects = (rawSubjects?: string[], legacySubject?: string | null): string[] => {
      if (rawSubjects && rawSubjects.length > 0) return rawSubjects;
      if (legacySubject) {
        return legacySubject
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    };

    expect(parseSubjects(["Botany", "Zoology"])).toEqual(["Botany", "Zoology"]);
    expect(parseSubjects(undefined, "Organic Chemistry, Inorganic Chemistry")).toEqual([
      "Organic Chemistry",
      "Inorganic Chemistry",
    ]);
    expect(parseSubjects([], "Physics")).toEqual(["Physics"]);
    expect(parseSubjects([], null)).toEqual([]);
  });
});
