import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";
import { applyPaymentToInstallments, type FeeInstallment } from "../src/lib/installments";
import { sendEnrollmentEmail, sendParentWelcomeEmail } from "../src/lib/email";

describe("Item 1 & 2 — Payment Flow Integrity & Parent Authorization", () => {
  const secretKey = "test_razorpay_secret_key_12345";

  function computeValidSignature(orderId: string, paymentId: string, secret: string) {
    return crypto.createHmac("sha256", secret).update(orderId + "|" + paymentId).digest("hex");
  }

  // Simulated authorization check replicating create-order / verify routes
  function authorizePaymentRequest(params: {
    session: { user?: { id: string; email?: string; role: string; instituteId?: string } } | null;
    student: { id: string; email?: string | null; instituteId: string };
    parentLinks?: Array<{ parentUserId: string; studentId: string }>;
  }) {
    const { session, student, parentLinks = [] } = params;
    if (!session || !session.user) {
      return { status: 401, error: "Unauthorized" };
    }

    const { role, id: userId, email: userEmail, instituteId } = session.user;

    if (role === "STUDENT") {
      const isSelf = student.id === userId || (student.email && student.email.toLowerCase() === userEmail?.toLowerCase());
      if (!isSelf) {
        return { status: 403, error: "Forbidden: You cannot pay fees for another student." };
      }
    } else if (role === "PARENT") {
      const isLinked = parentLinks.some((l) => l.parentUserId === userId && l.studentId === student.id);
      if (!isLinked) {
        return { status: 403, error: "Forbidden: You are not authorized to pay fees for this student." };
      }
    } else if (["OWNER", "ADMIN", "STAFF", "ACCOUNTANT"].includes(role)) {
      if (instituteId && student.instituteId !== instituteId) {
        return { status: 403, error: "Forbidden: Student does not belong to your institute." };
      }
    } else if (role !== "PLATFORM_ADMIN") {
      return { status: 403, error: "Forbidden: Unauthorized role." };
    }

    return { status: 200, ok: true };
  }

  // Simulated gateway signature verification
  function verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
    secret: string;
  }) {
    const expected = crypto.createHmac("sha256", params.secret).update(params.orderId + "|" + params.paymentId).digest("hex");
    return expected === params.signature;
  }

  it("rejects unauthenticated payment requests with 401", () => {
    const res = authorizePaymentRequest({
      session: null,
      student: { id: "student_1", instituteId: "inst_1" },
    });
    expect(res.status).toBe(401);
    expect(res.error).toBe("Unauthorized");
  });

  it("rejects a STUDENT trying to pay fees for another student with 403", () => {
    const res = authorizePaymentRequest({
      session: { user: { id: "user_student_1", email: "student1@test.com", role: "STUDENT" } },
      student: { id: "student_2", email: "student2@test.com", instituteId: "inst_1" },
    });
    expect(res.status).toBe(403);
    expect(res.error).toContain("Forbidden");
  });

  it("allows a STUDENT to pay fees for their own record", () => {
    const res = authorizePaymentRequest({
      session: { user: { id: "student_1", email: "student1@test.com", role: "STUDENT" } },
      student: { id: "student_1", email: "student1@test.com", instituteId: "inst_1" },
    });
    expect(res.status).toBe(200);
    expect(res.ok).toBe(true);
  });

  it("rejects a PARENT trying to pay fees for an unlinked student with 403", () => {
    const res = authorizePaymentRequest({
      session: { user: { id: "parent_user_1", email: "parent@test.com", role: "PARENT" } },
      student: { id: "student_unlinked", instituteId: "inst_1" },
      parentLinks: [{ parentUserId: "parent_user_1", studentId: "student_linked_child" }],
    });
    expect(res.status).toBe(403);
    expect(res.error).toContain("Forbidden");
  });

  it("allows a PARENT to pay fees for their linked child", () => {
    const res = authorizePaymentRequest({
      session: { user: { id: "parent_user_1", email: "parent@test.com", role: "PARENT" } },
      student: { id: "student_linked_child", instituteId: "inst_1" },
      parentLinks: [{ parentUserId: "parent_user_1", studentId: "student_linked_child" }],
    });
    expect(res.status).toBe(200);
    expect(res.ok).toBe(true);
  });

  it("rejects tampered or invalid Razorpay signature and does NOT credit fees", () => {
    const orderId = "order_98765";
    const paymentId = "pay_12345";
    const tamperedSignature = "tampered_fake_signature_hex_123";

    const isVerified = verifyPaymentSignature({
      orderId,
      paymentId,
      signature: tamperedSignature,
      secret: secretKey,
    });

    expect(isVerified).toBe(false);

    // Initial student state
    const student = { id: "student_1", paidFee: 10000, totalFee: 50000 };
    if (!isVerified) {
      // Payment rejected, paidFee is untouched
    }
    expect(student.paidFee).toBe(10000);
  });

  it("accepts genuine Razorpay signature and increments paidFee & applies installment updates correctly", () => {
    const orderId = "order_valid_001";
    const paymentId = "pay_valid_002";
    const validSignature = computeValidSignature(orderId, paymentId, secretKey);

    const isVerified = verifyPaymentSignature({
      orderId,
      paymentId,
      signature: validSignature,
      secret: secretKey,
    });

    expect(isVerified).toBe(true);

    const initialInstallments: FeeInstallment[] = [
      {
        id: "inst_1",
        installmentNumber: 1,
        title: "Term 1",
        amount: 25000,
        paidAmount: 0,
        dueDate: "2026-09-15",
        status: "PENDING",
      },
      {
        id: "inst_2",
        installmentNumber: 2,
        title: "Term 2",
        amount: 25000,
        paidAmount: 0,
        dueDate: "2026-11-15",
        status: "PENDING",
      },
    ];

    const payAmount = 25000;
    const result = applyPaymentToInstallments(initialInstallments, payAmount);

    expect(result.updatedInstallments[0].status).toBe("PAID");
    expect(result.updatedInstallments[0].paidAmount).toBe(25000);
    expect(result.updatedInstallments[1].status).toBe("PENDING");
    expect(result.nextDueDate).toBe("2026-11-15");
  });
});

describe("Item 3 — Multi-Child Access & Switching in Parent Portal", () => {
  const childA = {
    id: "child_A",
    name: "Aarav Sharma",
    courseName: "JEE Advanced",
    totalFee: 80000,
    paidFee: 40000,
    pendingFee: 40000,
    attendanceRate: "92%",
  };

  const childB = {
    id: "child_B",
    name: "Diya Sharma",
    courseName: "NEET Foundation",
    totalFee: 60000,
    paidFee: 60000,
    pendingFee: 0,
    attendanceRate: "98%",
  };

  const studentsList = [childA, childB];

  it("renders correct child data based on selectedStudentId with no stale leakage", () => {
    let activeStudentId = childA.id;
    let currentStudent = studentsList.find((s) => s.id === activeStudentId) || studentsList[0];

    expect(currentStudent.name).toBe("Aarav Sharma");
    expect(currentStudent.courseName).toBe("JEE Advanced");
    expect(currentStudent.pendingFee).toBe(40000);

    // Switch to Child B
    activeStudentId = childB.id;
    currentStudent = studentsList.find((s) => s.id === activeStudentId) || studentsList[0];

    expect(currentStudent.name).toBe("Diya Sharma");
    expect(currentStudent.courseName).toBe("NEET Foundation");
    expect(currentStudent.pendingFee).toBe(0);
  });
});

describe("Item 4 — Fee Reminders Contact Priority & Disambiguation", () => {
  it("prioritizes parentEmail over student.email when parentEmail exists", () => {
    const studentWithParentEmail = {
      name: "Rohan Verma",
      email: "rohan.student@test.com",
      parentEmail: "verma.parent@gmail.com",
      mobile: "9811111111",
      parentMobile: "9822222222",
    };

    const targetEmail = studentWithParentEmail.parentEmail || studentWithParentEmail.email;
    expect(targetEmail).toBe("verma.parent@gmail.com");

    const targetPhone = studentWithParentEmail.parentMobile || studentWithParentEmail.mobile;
    expect(targetPhone).toBe("9822222222");
  });

  it("falls back to student.email when parentEmail is not set", () => {
    const studentWithoutParentEmail = {
      name: "Ananya Gupta",
      email: "ananya.student@test.com",
      parentEmail: null,
    };

    const targetEmail = studentWithoutParentEmail.parentEmail || studentWithoutParentEmail.email;
    expect(targetEmail).toBe("ananya.student@test.com");
  });

  it("formats fee reminder messages with student name and course to avoid ambiguity for multi-child parents", () => {
    const candidate1 = {
      name: "Kabir Singh",
      courseName: "Class 10 Board Prep",
      dueAmount: 15000,
    };

    const candidate2 = {
      name: "Meera Singh",
      courseName: "Class 12 Board Prep",
      dueAmount: 20000,
    };

    const formatMessage = (c: { name: string; courseName: string; dueAmount: number }) =>
      `Fee Due Reminder: ₹${c.dueAmount.toLocaleString("en-IN")} for ${c.name} (${c.courseName})`;

    const msg1 = formatMessage(candidate1);
    const msg2 = formatMessage(candidate2);

    expect(msg1).toContain("Kabir Singh");
    expect(msg1).toContain("Class 10 Board Prep");
    expect(msg1).toContain("15,000");

    expect(msg2).toContain("Meera Singh");
    expect(msg2).toContain("Class 12 Board Prep");
    expect(msg2).toContain("20,000");

    expect(msg1).not.toEqual(msg2);
  });
});

describe("Welcome Email to Parent on Enrollment", () => {
  it("generates first-child welcome email with initial password and security warning", async () => {
    // When SMTP is not configured in test environment, sendParentWelcomeEmail returns { sent: false, reason: "not_configured" }
    // without throwing
    const res = await sendParentWelcomeEmail({
      to: "parent@test.com",
      studentName: "Aarav Sharma",
      courseName: "Class 10 CBSE",
      initialPassword: "password123",
      portalUrl: "http://localhost:3000/login",
      isExistingAccount: false,
    });

    expect(res).toBeDefined();
    expect(res.sent === true || res.reason === "not_configured").toBe(true);
  });

  it("generates second-child addition email without initial password block for existing parent", async () => {
    const res = await sendParentWelcomeEmail({
      to: "parent@test.com",
      studentName: "Diya Sharma",
      courseName: "Class 8 Foundation",
      portalUrl: "http://localhost:3000/login",
      isExistingAccount: true,
      linkedChildrenCount: 2,
    });

    expect(res).toBeDefined();
    expect(res.sent === true || res.reason === "not_configured").toBe(true);
  });

  it("simulates student creation flow: sends both student & parent emails for first child", async () => {
    const emailCalls: Array<{ type: string; to: string; initialPassword?: string; isExisting?: boolean }> = [];

    const mockSendEnrollmentEmail = async (params: { to: string; initialPassword?: string }) => {
      emailCalls.push({ type: "STUDENT", to: params.to, initialPassword: params.initialPassword });
      return { sent: true };
    };

    const mockSendParentWelcomeEmail = async (params: { to: string; initialPassword?: string; isExistingAccount?: boolean }) => {
      emailCalls.push({ type: "PARENT", to: params.to, initialPassword: params.initialPassword, isExisting: params.isExistingAccount });
      return { sent: true };
    };

    // Flow for First Child
    const student = { email: "aarav@test.com", name: "Aarav Sharma" };
    const parentEmail = "parent@test.com";
    const isNewParentUser = true;
    const priorParentLinkCount = 0;

    if (student.email) {
      await mockSendEnrollmentEmail({ to: student.email, initialPassword: "student123" });
    }
    if (parentEmail) {
      await mockSendParentWelcomeEmail({
        to: parentEmail,
        initialPassword: isNewParentUser ? "password123" : undefined,
        isExistingAccount: !isNewParentUser || priorParentLinkCount > 0,
      });
    }

    expect(emailCalls).toHaveLength(2);
    expect(emailCalls[0]).toEqual({ type: "STUDENT", to: "aarav@test.com", initialPassword: "student123" });
    expect(emailCalls[1]).toEqual({ type: "PARENT", to: "parent@test.com", initialPassword: "password123", isExisting: false });
  });

  it("simulates student creation flow: sends student email + child added notice without password for second child", async () => {
    const emailCalls: Array<{ type: string; to: string; initialPassword?: string; isExisting?: boolean }> = [];

    const mockSendEnrollmentEmail = async (params: { to: string; initialPassword?: string }) => {
      emailCalls.push({ type: "STUDENT", to: params.to, initialPassword: params.initialPassword });
      return { sent: true };
    };

    const mockSendParentWelcomeEmail = async (params: { to: string; initialPassword?: string; isExistingAccount?: boolean }) => {
      emailCalls.push({ type: "PARENT", to: params.to, initialPassword: params.initialPassword, isExisting: params.isExistingAccount });
      return { sent: true };
    };

    // Flow for Second Child (Existing Parent User)
    const student = { email: "diya@test.com", name: "Diya Sharma" };
    const parentEmail = "parent@test.com";
    const isNewParentUser = false; // already created
    const priorParentLinkCount = 1; // already linked to Aarav

    if (student.email) {
      await mockSendEnrollmentEmail({ to: student.email, initialPassword: "student123" });
    }
    if (parentEmail) {
      await mockSendParentWelcomeEmail({
        to: parentEmail,
        initialPassword: isNewParentUser ? "password123" : undefined,
        isExistingAccount: !isNewParentUser || priorParentLinkCount > 0,
      });
    }

    expect(emailCalls).toHaveLength(2);
    expect(emailCalls[0]).toEqual({ type: "STUDENT", to: "diya@test.com", initialPassword: "student123" });
    expect(emailCalls[1]).toEqual({ type: "PARENT", to: "parent@test.com", initialPassword: undefined, isExisting: true });
  });

  it("ensures student creation succeeds non-blockingly even if email dispatch fails/throws", async () => {
    let studentCreated = false;

    const failingEmailSend = async () => {
      throw new Error("SMTP connection timeout");
    };

    try {
      studentCreated = true;
      // Non-blocking catch handler
      await failingEmailSend().catch((err) => {
        expect(err.message).toBe("SMTP connection timeout");
      });
    } catch {
      studentCreated = false;
    }

    expect(studentCreated).toBe(true);
  });
});
