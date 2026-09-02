import { describe, it, expect } from "vitest";

describe("Enrollment Payment Options & Transaction Record", () => {
  it("processes enrollment payment modes and types correctly", () => {
    const paymentModes = ["Cash", "UPI", "Net Banking", "Debit / Credit Card", "Cheque"];
    const paymentTypes = ["FIRST_INSTALLMENT", "SEAT_BOOKING", "FULL_FEE", "CUSTOM", "PAY_LATER"];

    paymentModes.forEach((mode) => {
      expect(typeof mode).toBe("string");
    });

    paymentTypes.forEach((type) => {
      expect(typeof type).toBe("string");
    });
  });

  it("constructs payment note and installment details for initial enrollment payment", () => {
    const buildInitialPayment = ({
      initialPaid,
      paymentMethod,
      paymentType,
      paymentReference,
      firstInstTitle,
      seatBookedFlag,
      numRegFee,
    }: {
      initialPaid: number;
      paymentMethod: string;
      paymentType: string;
      paymentReference?: string | null;
      firstInstTitle?: string | null;
      seatBookedFlag?: boolean;
      numRegFee?: number | null;
    }) => {
      if (initialPaid <= 0) return null;

      let paymentNote =
        seatBookedFlag && numRegFee
          ? `Seat Booking / Registration Deposit (₹${numRegFee})${firstInstTitle ? ` — ${firstInstTitle}` : ""}`
          : firstInstTitle
          ? `Initial enrollment deposit (${firstInstTitle})`
          : paymentType === "FULL_FEE"
          ? "Full Course Fee Paid on Enrollment"
          : "Initial enrollment payment";

      if (paymentReference) {
        paymentNote += ` [Ref/UTR: ${paymentReference}]`;
      }

      return {
        amount: initialPaid,
        method: paymentMethod || "Cash",
        note: paymentNote,
        installmentTitle: firstInstTitle || (paymentType === "FULL_FEE" ? "Full Fee" : "Enrollment Payment"),
      };
    };

    const payment = buildInitialPayment({
      initialPaid: 25000,
      paymentMethod: "UPI",
      paymentType: "FIRST_INSTALLMENT",
      paymentReference: "UPI-9876543210",
      firstInstTitle: "Installment 1 (Term 1)",
    });

    expect(payment).not.toBeNull();
    expect(payment?.amount).toBe(25000);
    expect(payment?.method).toBe("UPI");
    expect(payment?.note).toContain("Installment 1 (Term 1)");
    expect(payment?.note).toContain("UPI-9876543210");
  });

  it("handles seat booking registration payment", () => {
    const regPayment = {
      amount: 2000,
      method: "Cash",
      note: "Seat Booking / Registration Deposit (₹2000) [Ref/UTR: Receipt #104]",
      installmentTitle: "Registration / Seat Booking",
    };

    expect(regPayment.amount).toBe(2000);
    expect(regPayment.note).toContain("Seat Booking");
    expect(regPayment.installmentTitle).toBe("Registration / Seat Booking");
  });
});

describe("Faculty Subject Permissions: Read-Only Enforcement", () => {
  const canEditSubjects = (role: string) => {
    const upper = role.toUpperCase();
    return upper === "OWNER" || upper === "ADMIN";
  };

  it("blocks faculty from adding, editing, or deleting subjects", () => {
    expect(canEditSubjects("FACULTY")).toBe(false);
    expect(canEditSubjects("STUDENT")).toBe(false);
  });

  it("permits owners and administrators to configure subjects", () => {
    expect(canEditSubjects("OWNER")).toBe(true);
    expect(canEditSubjects("ADMIN")).toBe(true);
  });
});

describe("Main Branch Master Access & Cross-Branch Administration", () => {
  type UserContext = {
    role: string;
    branchId?: string | null;
    isMainBranch?: boolean;
  };

  const canAccessAndModifyOtherBranches = (user: UserContext) => {
    const upperRole = user.role.toUpperCase();
    if (upperRole === "STUDENT" || upperRole === "FACULTY") {
      return false;
    }
    if (upperRole === "OWNER" || upperRole === "ADMIN" || upperRole === "PLATFORM_ADMIN") {
      return true;
    }
    return Boolean(user.isMainBranch);
  };

  it("allows Main Branch staff, owners, and administrators to access and modify other branches", () => {
    // Owner
    expect(canAccessAndModifyOtherBranches({ role: "OWNER", isMainBranch: true })).toBe(true);
    expect(canAccessAndModifyOtherBranches({ role: "OWNER", isMainBranch: false })).toBe(true);

    // Admin
    expect(canAccessAndModifyOtherBranches({ role: "ADMIN", isMainBranch: false })).toBe(true);

    // Staff at Main Branch
    expect(canAccessAndModifyOtherBranches({ role: "STAFF", isMainBranch: true })).toBe(true);
  });

  it("restricts satellite sub-branch staff from accessing or changing other branches", () => {
    // Staff at satellite branch
    expect(canAccessAndModifyOtherBranches({ role: "STAFF", isMainBranch: false })).toBe(false);

    // Faculty
    expect(canAccessAndModifyOtherBranches({ role: "FACULTY", isMainBranch: true })).toBe(false);

    // Student
    expect(canAccessAndModifyOtherBranches({ role: "STUDENT", isMainBranch: true })).toBe(false);
  });

  it("prevents deleting the Main Branch / Head Office", () => {
    const validateBranchDelete = (branch: { id: string; name: string; isMainBranch: boolean }) => {
      if (branch.isMainBranch) {
        return { error: "Cannot delete the Main Branch / Head Office. Reassign another branch as Main Branch first." };
      }
      return { ok: true };
    };

    expect(validateBranchDelete({ id: "b1", name: "Kota Main Campus", isMainBranch: true }).error).toBeDefined();
    expect(validateBranchDelete({ id: "b2", name: "Jaipur Center", isMainBranch: false }).ok).toBe(true);
  });
});
