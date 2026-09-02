import { describe, it, expect } from "vitest";
import { computeFeeStatus, feeStatusLabel } from "@/lib/fee";

describe("Fee Status Calculation Engine", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  it("should return PAID when fully paid", () => {
    expect(computeFeeStatus(10000, 10000, tomorrow)).toBe("PAID");
    expect(computeFeeStatus(10000, 15000, tomorrow)).toBe("PAID");
  });

  it("should return PAID even if due date is in the past when fully paid", () => {
    expect(computeFeeStatus(10000, 10000, yesterday)).toBe("PAID");
  });

  it("should return PARTIAL when partially paid and not overdue", () => {
    expect(computeFeeStatus(10000, 4000, tomorrow)).toBe("PARTIAL");
    expect(computeFeeStatus(10000, 4000, null)).toBe("PARTIAL");
  });

  it("should return PENDING when zero paid and not overdue", () => {
    expect(computeFeeStatus(10000, 0, tomorrow)).toBe("PENDING");
    expect(computeFeeStatus(10000, 0, null)).toBe("PENDING");
  });

  it("should return OVERDUE when due date is past and balance is outstanding", () => {
    // Zero paid and overdue
    expect(computeFeeStatus(10000, 0, yesterday)).toBe("OVERDUE");
    // Partial paid and overdue
    expect(computeFeeStatus(10000, 5000, yesterday)).toBe("OVERDUE");
  });

  it("should map status to human-readable labels", () => {
    expect(feeStatusLabel("PAID")).toBe("Paid");
    expect(feeStatusLabel("PARTIAL")).toBe("Partial");
    expect(feeStatusLabel("PENDING")).toBe("Pending");
    expect(feeStatusLabel("OVERDUE")).toBe("Overdue");
  });
});
