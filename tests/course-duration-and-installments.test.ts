import { describe, it, expect } from "vitest";
import {
  parseCourseDuration,
  formatCourseDuration,
  calculateCourseEndDate,
  getCourseDurationSummary,
} from "@/lib/course-duration";
import {
  generateInstallmentSchedule,
  applyPaymentToInstallments,
  recalculateInstallmentStatuses,
  computeInstallmentStats,
  type FeeInstallment,
} from "@/lib/installments";
import { SubscriptionPlan, CourseFeeType } from "@prisma/client";

describe("Course Duration Flexibility (Days, Months, Years)", () => {
  it("correctly parses course duration strings for days, months, and years", () => {
    // 15 Days case
    const p15Days = parseCourseDuration("15 Days");
    expect(p15Days).toEqual({ years: 0, months: 0, days: 15 });

    // 45 Days Crash Course
    const p45Days = parseCourseDuration("45 Days");
    expect(p45Days).toEqual({ years: 0, months: 0, days: 45 });

    // 1 Year and 6 Months case
    const p1Yr6Mo = parseCourseDuration("1 Year 6 Months");
    expect(p1Yr6Mo).toEqual({ years: 1, months: 6, days: 0 });

    // Decimal 1.5 Years
    const p1HalfYr = parseCourseDuration("1.5 Years");
    expect(p1HalfYr).toEqual({ years: 1, months: 6, days: 0 });

    // 2 Years Long Term
    const p2Yr = parseCourseDuration("2 Years");
    expect(p2Yr).toEqual({ years: 2, months: 0, days: 0 });

    // 3 Months
    const p3Mo = parseCourseDuration("3 Months");
    expect(p3Mo).toEqual({ years: 0, months: 3, days: 0 });
  });

  it("formats course duration parts into canonical strings", () => {
    expect(formatCourseDuration({ years: 0, months: 0, days: 15 })).toBe("15 Days");
    expect(formatCourseDuration({ years: 1, months: 6, days: 0 })).toBe("1 Year 6 Months");
    expect(formatCourseDuration({ years: 2, months: 0, days: 0 })).toBe("2 Years");
    expect(formatCourseDuration({ years: 0, months: 3, days: 0 })).toBe("3 Months");
    expect(formatCourseDuration({ years: 1, months: 0, days: 10 })).toBe("1 Year 10 Days");
  });

  it("accurately computes course end and completion dates", () => {
    const startDate = new Date(2026, 7, 1); // 1 August 2026

    // 15 days duration
    const end15Days = calculateCourseEndDate(startDate, "15 Days");
    expect(end15Days.getFullYear()).toBe(2026);
    expect(end15Days.getMonth()).toBe(7); // August
    expect(end15Days.getDate()).toBe(16); // 1 + 15 = 16 August

    // 1 Year 6 Months duration
    const end1Yr6Mo = calculateCourseEndDate(startDate, "1 Year 6 Months");
    expect(end1Yr6Mo.getFullYear()).toBe(2028);
    expect(end1Yr6Mo.getMonth()).toBe(1); // February 2028 (Aug + 18 months = Feb 2028)
    expect(end1Yr6Mo.getDate()).toBe(1);
  });

  it("computes duration summaries, progress percentages, and expiry status", () => {
    const startDate = new Date(2026, 7, 1); // 1 August 2026
    const asOfDate = new Date(2026, 7, 6); // 6 August 2026 (5 days elapsed)

    const summary = getCourseDurationSummary(startDate, "15 Days", asOfDate);
    expect(summary.totalDays).toBe(15);
    expect(summary.elapsedDays).toBe(5);
    expect(summary.daysRemaining).toBe(10);
    expect(summary.progressPercent).toBe(33);
    expect(summary.isExpired).toBe(false);

    // When course is finished / past end date
    const pastDate = new Date(2026, 7, 20); // 20 August 2026
    const expiredSummary = getCourseDurationSummary(startDate, "15 Days", pastDate);
    expect(expiredSummary.isExpired).toBe(true);
    expect(expiredSummary.progressPercent).toBe(100);
    expect(expiredSummary.daysRemaining).toBe(0);
  });
});

describe("School & Coaching Fees Processes (Installment Plans & Relaxation)", () => {
  it("supports SubscriptionPlan and CourseFeeType enums for Quarterly & Installments", () => {
    expect(SubscriptionPlan.QUARTERLY).toBe("QUARTERLY");
    expect(SubscriptionPlan.INSTALLMENTS).toBe("INSTALLMENTS");
    expect(SubscriptionPlan.ONE_TIME).toBe("ONE_TIME");
    expect(CourseFeeType.QUARTERLY).toBe("QUARTERLY");
  });

  it("generates automated 2-installment relaxation schedule (50% - 50%) for parents", () => {
    const startDate = new Date(2026, 7, 1); // 1 August 2026
    const schedule = generateInstallmentSchedule({
      totalFee: 80000,
      numberOfInstallments: 2,
      startDate,
    });

    expect(schedule.length).toBe(2);
    // 50% at admission
    expect(schedule[0].installmentNumber).toBe(1);
    expect(schedule[0].amount).toBe(40000);
    expect(schedule[0].paidAmount).toBe(0);
    expect(schedule[0].status).toBe("PENDING");

    // 50% in 2nd installment (+60 days)
    expect(schedule[1].installmentNumber).toBe(2);
    expect(schedule[1].amount).toBe(40000);
    expect(schedule[1].paidAmount).toBe(0);

    // Sum of installments equals total fee
    const sum = schedule.reduce((acc, i) => acc + i.amount, 0);
    expect(sum).toBe(80000);
  });

  it("generates 3-installment trimester schedule (40% - 30% - 30%)", () => {
    const schedule = generateInstallmentSchedule({
      totalFee: 90000,
      numberOfInstallments: 3,
      startDate: new Date(2026, 7, 1),
    });

    expect(schedule.length).toBe(3);
    expect(schedule[0].amount).toBe(36000); // 40%
    expect(schedule[1].amount).toBe(27000); // 30%
    expect(schedule[2].amount).toBe(27000); // 30%
    const sum = schedule.reduce((acc, i) => acc + i.amount, 0);
    expect(sum).toBe(90000);
  });

  it("generates 4-installment quarterly schedule (25% each)", () => {
    const schedule = generateInstallmentSchedule({
      totalFee: 100000,
      numberOfInstallments: 4,
      startDate: new Date(2026, 7, 1),
    });

    expect(schedule.length).toBe(4);
    expect(schedule[0].amount).toBe(25000);
    expect(schedule[1].amount).toBe(25000);
    expect(schedule[2].amount).toBe(25000);
    expect(schedule[3].amount).toBe(25000);
  });

  it("applies payments to specific installments and advances next due date", () => {
    const initialSchedule = generateInstallmentSchedule({
      totalFee: 70000,
      numberOfInstallments: 2,
      startDate: new Date(2026, 7, 1),
    });
    // Installment 1: 35,000, Installment 2: 35,000

    // Case 1: Parent pays Installment 1 in full (35,000)
    const res1 = applyPaymentToInstallments(initialSchedule, 35000, 1);
    expect(res1.updatedInstallments[0].status).toBe("PAID");
    expect(res1.updatedInstallments[0].paidAmount).toBe(35000);
    expect(res1.updatedInstallments[1].status).toBe("PENDING");
    expect(res1.updatedInstallments[1].paidAmount).toBe(0);
    // Next due date should point to Installment 2
    expect(res1.nextDueDate).toBe(initialSchedule[1].dueDate);

    // Case 2: Parent makes partial payment of 20,000 towards Installment 2
    const res2 = applyPaymentToInstallments(res1.updatedInstallments, 20000, 2);
    expect(res2.updatedInstallments[1].status).toBe("PARTIAL");
    expect(res2.updatedInstallments[1].paidAmount).toBe(20000);
    // Next due date stays on Installment 2 because 15,000 is still due
    expect(res2.nextDueDate).toBe(initialSchedule[1].dueDate);

    // Case 3: Parent clears remaining 15,000 of Installment 2
    const res3 = applyPaymentToInstallments(res2.updatedInstallments, 15000, 2);
    expect(res3.updatedInstallments[1].status).toBe("PAID");
    expect(res3.updatedInstallments[1].paidAmount).toBe(35000);
    // All installments paid: nextDueDate is null
    expect(res3.nextDueDate).toBeNull();
  });

  it("correctly identifies overdue installments based on date", () => {
    const pastDueDate = "2026-08-01";
    const futureDueDate = "2026-10-01";
    const currentDate = new Date(2026, 7, 15); // 15 August 2026

    const installments: FeeInstallment[] = [
      {
        id: "inst-1",
        installmentNumber: 1,
        title: "1st Installment",
        amount: 25000,
        dueDate: pastDueDate,
        paidAmount: 0,
        status: "PENDING",
      },
      {
        id: "inst-2",
        installmentNumber: 2,
        title: "2nd Installment",
        amount: 25000,
        dueDate: futureDueDate,
        paidAmount: 0,
        status: "PENDING",
      },
    ];

    const updated = recalculateInstallmentStatuses(installments, currentDate);
    expect(updated[0].status).toBe("OVERDUE");
    expect(updated[1].status).toBe("PENDING");

    const stats = computeInstallmentStats(updated);
    expect(stats.overdueCount).toBe(1);
    expect(stats.pendingAmount).toBe(50000);
    expect(stats.paidAmount).toBe(0);
    expect(stats.percentPaid).toBe(0);
    expect(stats.nextDueInstallment?.installmentNumber).toBe(1);
  });
});
