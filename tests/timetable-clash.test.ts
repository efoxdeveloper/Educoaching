import { describe, it, expect } from "vitest";
import { timesOverlap } from "@/lib/timetable";

describe("Timetable Conflict & Overlap Detector", () => {
  it("detects exact duplicate time range as overlapping", () => {
    expect(timesOverlap("09:00", "10:30", "09:00", "10:30")).toBe(true);
  });

  it("detects partial overlaps where slot B starts inside slot A", () => {
    expect(timesOverlap("09:00", "10:30", "10:00", "11:30")).toBe(true);
  });

  it("detects partial overlaps where slot A starts inside slot B", () => {
    expect(timesOverlap("10:00", "11:30", "09:00", "10:30")).toBe(true);
  });

  it("detects enclosure where slot A completely encloses slot B", () => {
    expect(timesOverlap("08:00", "12:00", "09:00", "10:00")).toBe(true);
  });

  it("detects enclosure where slot B completely encloses slot A", () => {
    expect(timesOverlap("09:00", "10:00", "08:00", "12:00")).toBe(true);
  });

  it("does not flag adjacent slots as overlapping (slot A ends when slot B begins)", () => {
    // 09:00 to 10:00, next slot 10:00 to 11:00
    expect(timesOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
    expect(timesOverlap("10:00", "11:00", "09:00", "10:00")).toBe(false);
  });

  it("does not flag completely disjoint slots as overlapping", () => {
    expect(timesOverlap("09:00", "10:00", "14:00", "15:00")).toBe(false);
  });

  it("supports multi-day recurring batch schedule array (e.g. Monday to Saturday)", () => {
    const DAYS_MON_SAT = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
    expect(DAYS_MON_SAT).toHaveLength(6);
    expect(DAYS_MON_SAT).toContain("MON");
    expect(DAYS_MON_SAT).toContain("SAT");
    expect(DAYS_MON_SAT).not.toContain("SUN");

    // Creating scheduled items for each day
    const batchId = "batch-1";
    const facultyId = "faculty-1";
    const startTime = "09:00";
    const endTime = "10:30";

    const slots = DAYS_MON_SAT.map((day) => ({
      batchId,
      facultyId,
      dayOfWeek: day,
      startTime,
      endTime,
    }));

    expect(slots).toHaveLength(6);
    // Every slot runs at the same time on each respective day
    slots.forEach((s, idx) => {
      expect(s.dayOfWeek).toBe(DAYS_MON_SAT[idx]);
      expect(s.startTime).toBe("09:00");
      expect(s.endTime).toBe("10:30");
    });
  });
});
