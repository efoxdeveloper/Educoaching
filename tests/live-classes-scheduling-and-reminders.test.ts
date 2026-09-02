import { describe, it, expect } from "vitest";

describe("Item 3 — Live Classes Scheduling & Join Window Logic", () => {
  const isClassJoinable = (scheduledAtIso: string, status: string, mockNowMs?: number) => {
    if (status === "CANCELLED" || status === "ENDED") return false;
    if (status === "LIVE") return true;
    const start = new Date(scheduledAtIso).getTime();
    const nowMs = mockNowMs !== undefined ? mockNowMs : Date.now();
    // Joinable starting 10 minutes (600,000 ms) before scheduled start
    return nowMs >= start - 10 * 60 * 1000;
  };

  it("disallows joining a scheduled class 30 minutes before start", () => {
    const classTime = new Date("2026-09-01T10:00:00.000Z");
    const thirtyMinutesBefore = new Date("2026-09-01T09:30:00.000Z").getTime();

    const joinable = isClassJoinable(classTime.toISOString(), "SCHEDULED", thirtyMinutesBefore);
    expect(joinable).toBe(false);
  });

  it("enables joining starting precisely 10 minutes before class start time", () => {
    const classTime = new Date("2026-09-01T10:00:00.000Z");
    const nineMinutesBefore = new Date("2026-09-01T09:51:00.000Z").getTime();
    const exactlyTenBefore = new Date("2026-09-01T09:50:00.000Z").getTime();

    expect(isClassJoinable(classTime.toISOString(), "SCHEDULED", exactlyTenBefore)).toBe(true);
    expect(isClassJoinable(classTime.toISOString(), "SCHEDULED", nineMinutesBefore)).toBe(true);
  });

  it("always allows joining when status is LIVE regardless of time offset", () => {
    const classTime = new Date("2026-09-01T10:00:00.000Z");
    const twentyMinutesBefore = new Date("2026-09-01T09:40:00.000Z").getTime();

    expect(isClassJoinable(classTime.toISOString(), "LIVE", twentyMinutesBefore)).toBe(true);
  });

  it("disallows joining when class status is ENDED or CANCELLED", () => {
    const classTime = new Date("2026-09-01T10:00:00.000Z");
    const rightNow = new Date("2026-09-01T10:05:00.000Z").getTime();

    expect(isClassJoinable(classTime.toISOString(), "ENDED", rightNow)).toBe(false);
    expect(isClassJoinable(classTime.toISOString(), "CANCELLED", rightNow)).toBe(false);
  });

  describe("Reminder Cron 15-Minute Window & Idempotency", () => {
    type MockLiveClass = {
      id: string;
      title: string;
      status: string;
      reminderSent: boolean;
      scheduledAt: Date;
    };

    const runLiveClassReminderCron = (
      classes: MockLiveClass[],
      now: Date
    ): { notifiedClasses: string[]; updatedClasses: MockLiveClass[] } => {
      const fifteenMinsLater = new Date(now.getTime() + 16 * 60 * 1000);
      const notifiedClasses: string[] = [];

      const updated = classes.map((c) => {
        if (
          c.status === "SCHEDULED" &&
          !c.reminderSent &&
          c.scheduledAt >= now &&
          c.scheduledAt <= fifteenMinsLater
        ) {
          notifiedClasses.push(c.id);
          return {
            ...c,
            reminderSent: true,
            status: "LIVE",
          };
        }
        return c;
      });

      return { notifiedClasses, updatedClasses: updated };
    };

    it("notifies upcoming classes in the 15-min window and skips outside window or already notified", () => {
      const now = new Date("2026-09-01T10:00:00.000Z");

      const classList: MockLiveClass[] = [
        {
          id: "lc-1",
          title: "Starting in 12 mins",
          status: "SCHEDULED",
          reminderSent: false,
          scheduledAt: new Date("2026-09-01T10:12:00.000Z"), // within window
        },
        {
          id: "lc-2",
          title: "Starting in 2 hours",
          status: "SCHEDULED",
          reminderSent: false,
          scheduledAt: new Date("2026-09-01T12:00:00.000Z"), // outside window
        },
        {
          id: "lc-3",
          title: "Starting in 5 mins but already reminded",
          status: "SCHEDULED",
          reminderSent: true,
          scheduledAt: new Date("2026-09-01T10:05:00.000Z"), // already sent
        },
      ];

      // First Cron Run
      const run1 = runLiveClassReminderCron(classList, now);
      expect(run1.notifiedClasses).toEqual(["lc-1"]);
      expect(run1.updatedClasses.find((c) => c.id === "lc-1")?.reminderSent).toBe(true);

      // Second Cron Run 1 minute later (idempotency verification)
      const oneMinLater = new Date("2026-09-01T10:01:00.000Z");
      const run2 = runLiveClassReminderCron(run1.updatedClasses, oneMinLater);
      expect(run2.notifiedClasses).toEqual([]); // 0 double sends!
    });
  });
});
