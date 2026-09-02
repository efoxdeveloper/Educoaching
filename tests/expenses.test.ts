import { describe, it, expect } from "vitest";

describe("Phase 2 - Expense Categorization & Aggregations", () => {
  type ExpenseItem = {
    amount: number;
    category: string;
    paymentMethod: string;
  };

  const sampleExpenses: ExpenseItem[] = [
    { amount: 35000, category: "RENT", paymentMethod: "Bank Transfer (NEFT/IMPS)" },
    { amount: 50000, category: "SALARIES", paymentMethod: "Bank Transfer (NEFT/IMPS)" },
    { amount: 4500, category: "UTILITIES", paymentMethod: "UPI / QR" },
    { amount: 2000, category: "STATIONERY_SUPPLIES", paymentMethod: "Cash" },
    { amount: 1500, category: "OTHER", paymentMethod: "Cash" },
  ];

  it("calculates total expense accurately", () => {
    const total = sampleExpenses.reduce((sum, e) => sum + e.amount, 0);
    expect(total).toBe(93000);
  });

  it("breaks down expenses by category correctly", () => {
    const breakdown: Record<string, number> = {};
    for (const e of sampleExpenses) {
      breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
    }
    expect(breakdown["RENT"]).toBe(35000);
    expect(breakdown["SALARIES"]).toBe(50000);
    expect(breakdown["UTILITIES"]).toBe(4500);
    expect(breakdown["STATIONERY_SUPPLIES"]).toBe(2000);
    expect(breakdown["OTHER"]).toBe(1500);
  });

  it("accurately computes cash vs digital outflow", () => {
    let cash = 0;
    let digital = 0;
    for (const e of sampleExpenses) {
      if (e.paymentMethod.toLowerCase() === "cash") {
        cash += e.amount;
      } else {
        digital += e.amount;
      }
    }
    expect(cash).toBe(3500);
    expect(digital).toBe(89500);
  });
});
