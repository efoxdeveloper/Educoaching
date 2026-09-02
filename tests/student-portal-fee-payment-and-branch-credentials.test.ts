import { describe, it, expect } from "vitest";

describe("Campus Change Permission: Restricted for Faculty & Student", () => {
  const canSwitchCampus = (role: string) => {
    const upper = role.toUpperCase();
    return upper === "OWNER" || upper === "ADMIN" || upper === "PLATFORM_ADMIN";
  };

  it("permits Owner and Admin to switch between all campus branches", () => {
    expect(canSwitchCampus("OWNER")).toBe(true);
    expect(canSwitchCampus("ADMIN")).toBe(true);
    expect(canSwitchCampus("PLATFORM_ADMIN")).toBe(true);
  });

  it("blocks Faculty and Students from switching campuses (locked to assigned branch credentials)", () => {
    expect(canSwitchCampus("FACULTY")).toBe(false);
    expect(canSwitchCampus("STUDENT")).toBe(false);
    expect(canSwitchCampus("STAFF")).toBe(false);
  });
});

describe("Allocated Batch Read-Only Visibility", () => {
  it("enforces canEdit = false for faculty and students viewing batches", () => {
    const canEditBatches = (role: string) => {
      const upper = role.toUpperCase();
      return upper === "OWNER" || upper === "ADMIN";
    };

    expect(canEditBatches("OWNER")).toBe(true);
    expect(canEditBatches("ADMIN")).toBe(true);
    expect(canEditBatches("FACULTY")).toBe(false);
    expect(canEditBatches("STUDENT")).toBe(false);
  });

  it("structures student allocated batch schedule for read-only portal display", () => {
    const studentWithBatch = {
      id: "stud-aarav",
      name: "Aarav Sharma",
      courseName: "JEE Main + Advanced",
      courseDuration: "2 Years",
      batch: {
        id: "b-jee-a",
        name: "Morning Pinnacle A",
        timing: "8:30 AM - 10:30 AM (Winter Schedule)",
        status: "Active (Ongoing)",
        branchName: "Kota Main Campus",
        facultyMembers: ["Dr. R. Sharma (Physics)", "Ms. A. Kapoor (Chemistry)"],
      },
    };

    expect(studentWithBatch.batch.name).toBe("Morning Pinnacle A");
    expect(studentWithBatch.batch.timing).toContain("Winter Schedule");
    expect(studentWithBatch.batch.branchName).toBe("Kota Main Campus");
    expect(studentWithBatch.batch.facultyMembers.length).toBe(2);
  });
});

describe("Student Portal Fee Payment Workflow", () => {
  it("validates payment amount according to student fee structure", () => {
    const feeStructure = {
      totalFee: 85000,
      paidFee: 50000,
      pendingFee: 35000,
      plan: "INSTALLMENTS",
      dueDate: "2026-10-15",
    };

    const validatePayment = (amount: number, pendingBalance: number) => {
      if (isNaN(amount) || amount <= 0) {
        return { valid: false, error: "Payment amount must be greater than 0" };
      }
      if (amount > pendingBalance) {
        return { valid: false, error: `Payment cannot exceed outstanding balance of ₹${pendingBalance}` };
      }
      return { valid: true, error: null };
    };

    // Valid installment payment
    expect(validatePayment(17500, feeStructure.pendingFee)).toEqual({ valid: true, error: null });

    // Valid full balance payment
    expect(validatePayment(35000, feeStructure.pendingFee)).toEqual({ valid: true, error: null });

    // Invalid overpayment
    expect(validatePayment(40000, feeStructure.pendingFee).valid).toBe(false);

    // Invalid negative or 0 payment
    expect(validatePayment(0, feeStructure.pendingFee).valid).toBe(false);
  });

  it("updates paid fee and pending balance after portal payment", () => {
    let student = {
      totalFee: 85000,
      paidFee: 50000,
      pendingFee: 35000,
      payments: [
        { id: "p1", amount: 50000, method: "UPI", paidAt: "2026-08-01T10:00:00.000Z" },
      ],
    };

    const processPortalPayment = (
      current: typeof student,
      payAmount: number,
      method: string
    ) => {
      const newPaid = current.paidFee + payAmount;
      const newPending = Math.max(0, current.totalFee - newPaid);
      const newPayment = {
        id: `p-${Date.now()}`,
        amount: payAmount,
        method,
        paidAt: new Date().toISOString(),
      };

      return {
        ...current,
        paidFee: newPaid,
        pendingFee: newPending,
        payments: [newPayment, ...current.payments],
      };
    };

    const updated = processPortalPayment(student, 17500, "UPI");
    expect(updated.paidFee).toBe(67500);
    expect(updated.pendingFee).toBe(17500);
    expect(updated.payments.length).toBe(2);
    expect(updated.payments[0].method).toBe("UPI");
    expect(updated.payments[0].amount).toBe(17500);
  });
});
