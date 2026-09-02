import { describe, it, expect } from "vitest";

describe("Counsellor Performance Analytics Engine", () => {
  it("calculates conversion rate accurately", () => {
    const calcConversion = (enrolled: number, assigned: number) => {
      if (assigned <= 0) return 0;
      return Number(((enrolled / assigned) * 100).toFixed(1));
    };

    expect(calcConversion(5, 20)).toBe(25.0);
    expect(calcConversion(1, 3)).toBe(33.3);
    expect(calcConversion(0, 10)).toBe(0);
    expect(calcConversion(0, 0)).toBe(0);
  });

  it("aggregates total closed enrollment revenue", () => {
    const enrolledLeads = [
      { feePlan: 25000, stage: "ENROLLED" },
      { feePlan: 40000, stage: "ENROLLED" },
      { feePlan: 15000, stage: "ENROLLED" },
      { feePlan: 30000, stage: "NEW" }, // not enrolled yet
    ];

    const totalRevenue = enrolledLeads
      .filter((l) => l.stage === "ENROLLED")
      .reduce((sum, l) => sum + l.feePlan, 0);

    expect(totalRevenue).toBe(80000);
  });

  it("ranks counsellors primarily by enrolled conversions then revenue", () => {
    const counsellors = [
      { name: "Counsellor B", enrolled: 3, revenue: 150000 },
      { name: "Counsellor A", enrolled: 5, revenue: 100000 },
      { name: "Counsellor C", enrolled: 3, revenue: 90000 },
      { name: "Counsellor D", enrolled: 0, revenue: 0 },
    ];

    const sorted = [...counsellors].sort((a, b) => b.enrolled - a.enrolled || b.revenue - a.revenue);

    expect(sorted[0].name).toBe("Counsellor A"); // 5 enrolled
    expect(sorted[1].name).toBe("Counsellor B"); // 3 enrolled, 150k
    expect(sorted[2].name).toBe("Counsellor C"); // 3 enrolled, 90k
    expect(sorted[3].name).toBe("Counsellor D"); // 0 enrolled
  });

  it("calculates call disposition percentages accurately", () => {
    const dispositions = {
      INTERESTED: 10,
      DEMO_BOOKED: 5,
      CALL_BACK: 3,
      DROPPED: 2,
    };
    const total = Object.values(dispositions).reduce((a, b) => a + b, 0); // 20

    const interestedPct = Number(((dispositions.INTERESTED / total) * 100).toFixed(1));
    const demoPct = Number(((dispositions.DEMO_BOOKED / total) * 100).toFixed(1));

    expect(interestedPct).toBe(50.0);
    expect(demoPct).toBe(25.0);
  });

  it("accurately groups leads by assignedToId -> Faculty.name instead of fragile free text", () => {
    const facultyList = [
      { id: "fac-1", name: "Priya Sharma", roleType: "COUNSELLOR" },
      { id: "fac-2", name: "Amit Kumar", roleType: "COUNSELLOR" },
    ];
    const facultyMap = new Map(facultyList.map((f) => [f.id, f.name]));

    const admissions = [
      { id: "lead-1", assignedToId: "fac-1", assignedTo: "priya s.", stage: "ENROLLED" },
      { id: "lead-2", assignedToId: "fac-1", assignedTo: "Priya Sharma", stage: "ENROLLED" },
      { id: "lead-3", assignedToId: "fac-2", assignedTo: "Amit K", stage: "CONTACTED" },
    ];

    const getCounsellorName = (a: (typeof admissions)[number]) => {
      if (a.assignedToId && facultyMap.has(a.assignedToId)) {
        return facultyMap.get(a.assignedToId)!;
      }
      return a.assignedTo || "Unassigned";
    };

    const priyaLeads = admissions.filter((a) => getCounsellorName(a) === "Priya Sharma");
    expect(priyaLeads).toHaveLength(2);
    expect(priyaLeads.every((l) => l.stage === "ENROLLED")).toBe(true);

    const amitLeads = admissions.filter((a) => getCounsellorName(a) === "Amit Kumar");
    expect(amitLeads).toHaveLength(1);
  });

  it("falls back to all active faculty when no staff has roleType COUNSELLOR", () => {
    const allFaculty = [
      { id: "fac-1", name: "Dr. Verma", roleType: "FACULTY" },
      { id: "fac-2", name: "Rohan Admin", roleType: "ACCOUNTANT" },
    ];

    const counsellorsOnly = allFaculty.filter((f) => f.roleType === "COUNSELLOR");
    const dropdownOptions = counsellorsOnly.length > 0 ? counsellorsOnly : allFaculty;

    expect(dropdownOptions).toHaveLength(2);
    expect(dropdownOptions[0].name).toBe("Dr. Verma");
  });
});
