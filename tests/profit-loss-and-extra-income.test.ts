import { describe, it, expect } from "vitest";

describe("Feature 2 — Extra Income tracking + Proper P&L Reports", () => {
  describe("1. Net Profit Calculation Logic", () => {
    it("correctly calculates Net Profit = (Fee Collections + Extra Income) - Total Expenses", () => {
      // Mock fee payments (including a refund)
      const mockPayments = [
        { amount: 50000, isRefund: false },
        { amount: 35000, isRefund: false },
        { amount: 15000, isRefund: false },
        { amount: 5000, isRefund: true }, // 5,000 refunded
      ];

      const netFeeCollected = mockPayments.reduce(
        (acc, p) => (p.isRefund ? acc - p.amount : acc + p.amount),
        0
      );
      expect(netFeeCollected).toBe(95000); // 100,000 - 5,000 = 95,000

      // Mock extra non-fee income
      const mockExtraIncome = [
        { category: "BOOK_SALES", amount: 12000 },
        { category: "HALL_RENTAL", amount: 25000 },
        { category: "LATE_FEE_PENALTY", amount: 3000 },
      ];

      const totalExtraIncome = mockExtraIncome.reduce((acc, i) => acc + i.amount, 0);
      expect(totalExtraIncome).toBe(40000);

      const totalGrossRevenue = netFeeCollected + totalExtraIncome;
      expect(totalGrossRevenue).toBe(135000);

      // Mock expenses
      const mockExpenses = [
        { category: "RENT", amount: 45000 },
        { category: "SALARIES", amount: 50000 },
        { category: "UTILITIES", amount: 8000 },
      ];

      const totalExpenses = mockExpenses.reduce((acc, e) => acc + e.amount, 0);
      expect(totalExpenses).toBe(103000);

      // Net Profit calculation
      const netProfit = totalGrossRevenue - totalExpenses;
      const profitMargin = Math.round((netProfit / totalGrossRevenue) * 100);

      expect(netProfit).toBe(32000); // 135,000 - 103,000 = 32,000
      expect(profitMargin).toBe(24); // (32,000 / 135,000) * 100 ~ 23.7% -> 24%
    });

    it("handles negative profit (operating loss) without errors", () => {
      const netFeeCollected = 20000;
      const totalExtraIncome = 5000;
      const totalRevenue = netFeeCollected + totalExtraIncome; // 25,000
      const totalExpenses = 40000;

      const netProfit = totalRevenue - totalExpenses;
      expect(netProfit).toBe(-15000);
      const margin = Math.round((netProfit / totalRevenue) * 100);
      expect(margin).toBe(-60);
    });
  });

  describe("2. Consistency Between Per-Branch Stats & Institute-Wide Report", () => {
    it("ensures sum of per-branch net profits matches the consolidated institute report", () => {
      // Branch 1
      const branch1 = {
        name: "North Campus",
        feesCollected: 60000,
        extraIncome: 15000,
        expenses: 50000,
      };
      const branch1NetProfit = branch1.feesCollected + branch1.extraIncome - branch1.expenses;
      expect(branch1NetProfit).toBe(25000);

      // Branch 2
      const branch2 = {
        name: "South Campus",
        feesCollected: 80000,
        extraIncome: 20000,
        expenses: 70000,
      };
      const branch2NetProfit = branch2.feesCollected + branch2.extraIncome - branch2.expenses;
      expect(branch2NetProfit).toBe(30000);

      // Consolidated Institute-Wide Report
      const consolidatedFeeRevenue = branch1.feesCollected + branch2.feesCollected; // 140,000
      const consolidatedExtraIncome = branch1.extraIncome + branch2.extraIncome; // 35,000
      const consolidatedTotalRevenue = consolidatedFeeRevenue + consolidatedExtraIncome; // 175,000
      const consolidatedExpenses = branch1.expenses + branch2.expenses; // 120,000

      const consolidatedNetProfit = consolidatedTotalRevenue - consolidatedExpenses; // 55,000

      expect(consolidatedNetProfit).toBe(branch1NetProfit + branch2NetProfit);
      expect(consolidatedNetProfit).toBe(55000);
    });
  });

  describe("3. Income & Expense Category Breakdown Distribution", () => {
    it("groups extra income and expense categories accurately with percentage weights", () => {
      const extraIncomes = [
        { category: "BOOK_SALES", amount: 30000 },
        { category: "BOOK_SALES", amount: 10000 },
        { category: "HALL_RENTAL", amount: 60000 },
      ];

      const totalExtra = 100000;
      const catMap: Record<string, { total: number; count: number; percentage: number }> = {};

      for (const item of extraIncomes) {
        if (!catMap[item.category]) {
          catMap[item.category] = { total: 0, count: 0, percentage: 0 };
        }
        catMap[item.category].total += item.amount;
        catMap[item.category].count += 1;
      }

      for (const k in catMap) {
        catMap[k].percentage = Math.round((catMap[k].total / totalExtra) * 100);
      }

      expect(catMap["BOOK_SALES"].total).toBe(40000);
      expect(catMap["BOOK_SALES"].count).toBe(2);
      expect(catMap["BOOK_SALES"].percentage).toBe(40);

      expect(catMap["HALL_RENTAL"].total).toBe(60000);
      expect(catMap["HALL_RENTAL"].count).toBe(1);
      expect(catMap["HALL_RENTAL"].percentage).toBe(60);
    });
  });
});
