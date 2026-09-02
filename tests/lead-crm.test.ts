import { describe, it, expect } from "vitest";

describe("Lead CRM Pipeline & Counselling Logic", () => {
  const STAGES = ["NEW", "CONTACTED", "DEMO_SCHEDULED", "COUNSELLING", "ENROLLED", "LOST"];

  it("should have valid pipeline stage order", () => {
    expect(STAGES.indexOf("NEW")).toBe(0);
    expect(STAGES.indexOf("CONTACTED")).toBe(1);
    expect(STAGES.indexOf("DEMO_SCHEDULED")).toBe(2);
    expect(STAGES.indexOf("COUNSELLING")).toBe(3);
    expect(STAGES.indexOf("ENROLLED")).toBe(4);
    expect(STAGES.indexOf("LOST")).toBe(5);
  });

  it("correctly identifies when a follow-up is due today", () => {
    const isToday = (dateStr: string) => {
      const d = new Date(dateStr);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    };

    const now = new Date().toISOString();
    expect(isToday(now)).toBe(true);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    expect(isToday(pastDate.toISOString())).toBe(false);
  });

  it("correctly flags overdue follow-up calls", () => {
    const isOverdue = (dateStr: string) => {
      const d = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d < today;
    };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isOverdue(yesterday.toISOString())).toBe(true);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isOverdue(tomorrow.toISOString())).toBe(false);
  });

  it("synchronizes stage with enrollment status", () => {
    const syncStageToStatus = (stage: string) => {
      if (stage === "ENROLLED") return "ENROLLED";
      if (stage === "LOST") return "REJECTED";
      return "PENDING";
    };

    expect(syncStageToStatus("ENROLLED")).toBe("ENROLLED");
    expect(syncStageToStatus("LOST")).toBe("REJECTED");
    expect(syncStageToStatus("NEW")).toBe("PENDING");
    expect(syncStageToStatus("COUNSELLING")).toBe("PENDING");
  });

  it("handles demo class status progression", () => {
    const getStageAfterDemo = (demoStatus: string) => {
      if (demoStatus === "ATTENDED") return "COUNSELLING";
      if (demoStatus === "CANCELLED" || demoStatus === "MISSED") return "CONTACTED";
      return "DEMO_SCHEDULED";
    };

    expect(getStageAfterDemo("SCHEDULED")).toBe("DEMO_SCHEDULED");
    expect(getStageAfterDemo("ATTENDED")).toBe("COUNSELLING");
    expect(getStageAfterDemo("MISSED")).toBe("CONTACTED");
  });

  it("validates lost lead reasons", () => {
    const VALID_LOST_REASONS = [
      "FEE_TOO_HIGH",
      "TIMING_CLASH",
      "DISTANCE_ISSUE",
      "JOINED_COMPETITOR",
      "DECIDED_AGAINST",
      "UNRESPONSIVE",
      "OTHER",
    ];

    expect(VALID_LOST_REASONS.includes("FEE_TOO_HIGH")).toBe(true);
    expect(VALID_LOST_REASONS.includes("TIMING_CLASH")).toBe(true);
    expect(VALID_LOST_REASONS.includes("UNKNOWN_REASON")).toBe(false);
  });

  it("calculates enrollment balance accurately with initial payment", () => {
    const convertLeadToEnrollment = ({
      totalFee,
      initialPaid,
    }: {
      totalFee: number;
      initialPaid: number;
    }) => {
      const paid = Math.min(totalFee, Math.max(0, initialPaid));
      const balance = totalFee - paid;
      return { totalFee, paidFee: paid, balance };
    };

    const res1 = convertLeadToEnrollment({ totalFee: 45000, initialPaid: 10000 });
    expect(res1.paidFee).toBe(10000);
    expect(res1.balance).toBe(35000);

    const res2 = convertLeadToEnrollment({ totalFee: 50000, initialPaid: 0 });
    expect(res2.paidFee).toBe(0);
    expect(res2.balance).toBe(50000);
  });
});

describe("Advanced Owner Dashboard Business KPI Logic", () => {
  it("computes net operating cash flow correctly", () => {
    const calcNetCashFlow = (collections: number, expenses: number) => collections - expenses;

    expect(calcNetCashFlow(250000, 80000)).toBe(170000);
    expect(calcNetCashFlow(50000, 75000)).toBe(-25000);
  });

  it("computes fee recovery rate and ARPU", () => {
    const calcRecoveryRate = (collected: number, billed: number) =>
      billed > 0 ? Math.round((collected / billed) * 100) : 0;
    const calcArpu = (collected: number, studentCount: number) =>
      studentCount > 0 ? Math.round(collected / studentCount) : 0;

    expect(calcRecoveryRate(180000, 200000)).toBe(90);
    expect(calcRecoveryRate(0, 50000)).toBe(0);

    expect(calcArpu(200000, 10)).toBe(20000);
    expect(calcArpu(0, 0)).toBe(0);
  });

  it("computes lead funnel conversion percentage", () => {
    const calcConversionRate = (enrolled: number, totalLeads: number) =>
      totalLeads > 0 ? Number(((enrolled / totalLeads) * 100).toFixed(1)) : 0;

    expect(calcConversionRate(15, 60)).toBe(25.0);
    expect(calcConversionRate(0, 10)).toBe(0.0);
    expect(calcConversionRate(0, 0)).toBe(0);
  });
});
