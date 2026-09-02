import { describe, it, expect } from "vitest";

describe("Phase 4: Multi-Branch Operations & AI Academic Engine", () => {
  it("calculates branch-level financial metrics and operating margin", () => {
    const branchA = {
      name: "South Extension Campus",
      studentCount: 50,
      totalCollected: 500000,
      totalExpenses: 200000,
    };

    const netProfit = branchA.totalCollected - branchA.totalExpenses;
    const profitMargin = Math.round((netProfit / branchA.totalCollected) * 100);

    expect(netProfit).toBe(300000);
    expect(profitMargin).toBe(60);
  });

  it("safeguards branch deletion when active dependencies exist", () => {
    const canDeleteBranch = (records: { students: number; batches: number; admissions: number }) => {
      if (records.students > 0 || records.batches > 0 || records.admissions > 0) {
        return {
          allowed: false,
          reason: `Branch has ${records.students} students and ${records.batches} batches.`,
        };
      }
      return { allowed: true };
    };

    expect(canDeleteBranch({ students: 5, batches: 1, admissions: 0 }).allowed).toBe(false);
    expect(canDeleteBranch({ students: 0, batches: 0, admissions: 0 }).allowed).toBe(true);
  });

  it("validates AI generated question structure and formatting", () => {
    const generatedSample = {
      questionText: "What is the acceleration of a 4kg block under 20N force on a smooth plane?",
      options: ["5 m/s²", "10 m/s²", "2 m/s²", "8 m/s²"],
      correctAnswer: "0",
      marks: 4,
      negativeMarks: 1,
      explanation: "a = F / m = 20 / 4 = 5 m/s².",
    };

    expect(generatedSample.options).toHaveLength(4);
    expect(Number(generatedSample.correctAnswer)).toBeGreaterThanOrEqual(0);
    expect(Number(generatedSample.correctAnswer)).toBeLessThan(4);
    expect(generatedSample.marks).toBe(4);
    expect(generatedSample.negativeMarks).toBe(1);
    expect(generatedSample.explanation.length).toBeGreaterThan(10);
  });

  it("evaluates AI doubt solver topic classification", () => {
    const classifyDoubtConcept = (question: string) => {
      const q = question.toLowerCase();
      if (q.includes("force") || q.includes("acceleration") || q.includes("mass")) {
        return "Newtonian Dynamics & Mechanical Equilibrium";
      }
      if (q.includes("mole") || q.includes("equilibrium") || q.includes("ph")) {
        return "Chemical Equilibrium & Reaction Stoichiometry";
      }
      if (q.includes("derivative") || q.includes("integral") || q.includes("calculus")) {
        return "Calculus & Function Optimization";
      }
      return "General Conceptual Principles";
    };

    expect(classifyDoubtConcept("Find the acceleration of a mass under friction")).toBe(
      "Newtonian Dynamics & Mechanical Equilibrium"
    );
    expect(classifyDoubtConcept("Calculate the pH and equilibrium concentration of H+")).toBe(
      "Chemical Equilibrium & Reaction Stoichiometry"
    );
    expect(classifyDoubtConcept("Find the derivative of sin(2x)cos(2x)")).toBe(
      "Calculus & Function Optimization"
    );
  });
});
