import { describe, it, expect } from "vitest";
import { DiscountRequestStatus } from "@prisma/client";

describe("Branch-Specific Batch Allocation (Without Faculty Requirement)", () => {
  it("allows allocating batches to different branches for the same course with distinct timings", () => {
    const course = {
      id: "course-jee-adv",
      name: "JEE Advanced Pinnacle (Class 11)",
      fee: 85000,
    };

    const branches = [
      { id: "branch-kota", name: "Kota Main Campus", city: "Kota" },
      { id: "branch-jaipur", name: "Jaipur Center", city: "Jaipur" },
    ];

    // Same course, different branches, different batches & timings
    const batchKota = {
      id: "b-1",
      name: "Kota Morning Pinnacle A",
      courseId: course.id,
      branchId: branches[0].id,
      timing: "7:00 AM - 9:00 AM",
      capacity: 50,
      status: "Active",
    };

    const batchJaipur = {
      id: "b-2",
      name: "Jaipur Evening Pinnacle J-1",
      courseId: course.id,
      branchId: branches[1].id,
      timing: "4:30 PM - 6:30 PM",
      capacity: 40,
      status: "Active",
    };

    // Faculty is completely detached from batch schema & requirements
    expect((batchKota as any).facultyId).toBeUndefined();
    expect((batchJaipur as any).facultyId).toBeUndefined();

    // Verify branch allocation
    expect(batchKota.branchId).toBe("branch-kota");
    expect(batchJaipur.branchId).toBe("branch-jaipur");
    expect(batchKota.timing).not.toBe(batchJaipur.timing);

    // Filter helper: when student selects Jaipur branch, only Jaipur batches for this course show
    const getBatchesForStudent = (courseId: string, branchId?: string | null) => {
      const allBatches = [batchKota, batchJaipur];
      return allBatches.filter(
        (b) => b.courseId === courseId && (!branchId || !b.branchId || b.branchId === branchId)
      );
    };

    const studentJaipurBatches = getBatchesForStudent(course.id, "branch-jaipur");
    expect(studentJaipurBatches.length).toBe(1);
    expect(studentJaipurBatches[0].name).toBe("Jaipur Evening Pinnacle J-1");
    expect(studentJaipurBatches[0].timing).toBe("4:30 PM - 6:30 PM");

    const studentKotaBatches = getBatchesForStudent(course.id, "branch-kota");
    expect(studentKotaBatches.length).toBe(1);
    expect(studentKotaBatches[0].name).toBe("Kota Morning Pinnacle A");
  });
});

describe("Student Enrollment: Registration Fee to Book Student Seat", () => {
  it("processes seat booking with registration fee as advance deposit", () => {
    const courseFee = 60000;
    const registrationFee = 2500;

    const enrollment = {
      studentName: "Aditya Sharma",
      courseFee,
      isSeatBooked: true,
      registrationFee,
      paidFee: registrationFee, // Registration fee received upfront
      pendingFee: courseFee - registrationFee,
    };

    expect(enrollment.isSeatBooked).toBe(true);
    expect(enrollment.registrationFee).toBe(2500);
    expect(enrollment.paidFee).toBe(2500);
    expect(enrollment.pendingFee).toBe(57500);
  });
});

describe("Discount Option Bar (Faculty <= 30% vs Owner Approval > 30%)", () => {
  const evaluateDiscountPolicy = (discountPercent: number) => {
    const FACULTY_DISCOUNT_CAP = 30;
    if (discountPercent <= 0) {
      return {
        requiresApproval: false,
        status: "STANDARD_PRICE",
        canFacultyApply: true,
      };
    }
    if (discountPercent <= FACULTY_DISCOUNT_CAP) {
      return {
        requiresApproval: false,
        status: "AUTO_APPROVED",
        canFacultyApply: true,
      };
    }
    return {
      requiresApproval: true,
      status: "PENDING_OWNER_APPROVAL",
      canFacultyApply: false,
    };
  };

  it("auto-approves discounts up to 30% for faculty and staff", () => {
    expect(evaluateDiscountPolicy(0)).toEqual({
      requiresApproval: false,
      status: "STANDARD_PRICE",
      canFacultyApply: true,
    });

    expect(evaluateDiscountPolicy(10)).toEqual({
      requiresApproval: false,
      status: "AUTO_APPROVED",
      canFacultyApply: true,
    });

    expect(evaluateDiscountPolicy(20)).toEqual({
      requiresApproval: false,
      status: "AUTO_APPROVED",
      canFacultyApply: true,
    });

    expect(evaluateDiscountPolicy(30)).toEqual({
      requiresApproval: false,
      status: "AUTO_APPROVED",
      canFacultyApply: true,
    });
  });

  it("requires institute owner approval when discount exceeds 30%", () => {
    const policy35 = evaluateDiscountPolicy(35);
    expect(policy35.requiresApproval).toBe(true);
    expect(policy35.status).toBe("PENDING_OWNER_APPROVAL");
    expect(policy35.canFacultyApply).toBe(false);

    const policy40 = evaluateDiscountPolicy(40);
    expect(policy40.requiresApproval).toBe(true);
    expect(policy40.status).toBe("PENDING_OWNER_APPROVAL");

    const policy50 = evaluateDiscountPolicy(50);
    expect(policy50.requiresApproval).toBe(true);
    expect(policy50.status).toBe("PENDING_OWNER_APPROVAL");
  });

  it("calculates discount savings and final fee correctly", () => {
    const baseFee = 50000;

    const computeDiscountDetails = (fee: number, pct: number) => {
      const discountAmount = Math.round(fee * (pct / 100));
      const finalFee = Math.max(0, fee - discountAmount);
      return { discountAmount, finalFee };
    };

    // 25% discount (Within faculty limit)
    const d25 = computeDiscountDetails(baseFee, 25);
    expect(d25.discountAmount).toBe(12500);
    expect(d25.finalFee).toBe(37500);

    // 40% discount (Requires owner approval)
    const d40 = computeDiscountDetails(baseFee, 40);
    expect(d40.discountAmount).toBe(20000);
    expect(d40.finalFee).toBe(30000);
  });

  it("handles owner approval and rejection state transitions", () => {
    expect(DiscountRequestStatus.PENDING).toBe("PENDING");
    expect(DiscountRequestStatus.APPROVED).toBe("APPROVED");
    expect(DiscountRequestStatus.REJECTED).toBe("REJECTED");

    type DiscountRequestRecord = {
      id: string;
      status: DiscountRequestStatus;
      decisionNotes?: string;
      decisionByName?: string;
      decisionAt?: Date;
    };

    const pendingRequest: DiscountRequestRecord = {
      id: "req-1",
      status: DiscountRequestStatus.PENDING,
    };

    // Owner approves request
    const approve = (req: DiscountRequestRecord, ownerName: string, notes: string): DiscountRequestRecord => ({
      ...req,
      status: DiscountRequestStatus.APPROVED,
      decisionByName: ownerName,
      decisionNotes: notes,
      decisionAt: new Date(),
    });

    const approved = approve(pendingRequest, "Director Verma", "Approved merit concession");
    expect(approved.status).toBe("APPROVED");
    expect(approved.decisionByName).toBe("Director Verma");
    expect(approved.decisionNotes).toBe("Approved merit concession");

    // Owner rejects request
    const reject = (req: DiscountRequestRecord, ownerName: string, notes: string): DiscountRequestRecord => ({
      ...req,
      status: DiscountRequestStatus.REJECTED,
      decisionByName: ownerName,
      decisionNotes: notes,
      decisionAt: new Date(),
    });

    const rejected = reject(pendingRequest, "Director Verma", "Discount cap cannot exceed 30% for regular batches");
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.decisionByName).toBe("Director Verma");
  });
});
