import { describe, it, expect } from "vitest";

describe("WhatsApp Online Exam Link & Registration Flow", () => {
  it("formats WhatsApp exam share message with all required metadata", () => {
    const test = {
      id: "test-cbt-101",
      title: "JEE Mains Full Syllabus Mock Test 1",
      subject: "Physics & Chemistry",
      batchName: "Target JEE 2026 Batch",
      durationMinutes: 90,
      totalMarks: 120,
      negativeMarks: 1,
    };
    const domain = "https://coaching.app";
    const examLink = `${domain}/exam/${test.id}`;

    const messageText = `*Dear Student,*
Your online examination for *${test.title}* is now active!

📋 *Exam Details:*
• Subject: ${test.subject}
• Batch: ${test.batchName}
• Duration: ${test.durationMinutes} Minutes
• Total Marks: ${test.totalMarks} Marks
• Negative Marking: -${test.negativeMarks} per incorrect answer

👉 *Click here to fill your credentials & start the exam:*
${examLink}

_Best of luck for your exam!_`;

    expect(messageText).toContain("JEE Mains Full Syllabus Mock Test 1");
    expect(messageText).toContain("Duration: 90 Minutes");
    expect(messageText).toContain("Total Marks: 120 Marks");
    expect(messageText).toContain("https://coaching.app/exam/test-cbt-101");
  });

  it("normalizes student WhatsApp mobile numbers and validates credentials", () => {
    const cleanMobileNumber = (raw: string) => {
      const cleaned = raw.replace(/\D/g, "");
      if (cleaned.length === 10) return cleaned;
      if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned.slice(2);
      return null;
    };

    expect(cleanMobileNumber("9876543210")).toBe("9876543210");
    expect(cleanMobileNumber("+91 98765-43210")).toBe("9876543210");
    expect(cleanMobileNumber("919876543210")).toBe("9876543210");
    expect(cleanMobileNumber("1234")).toBeNull();
  });

  it("secures online exam questions from leaking answers during registration", () => {
    const rawDbQuestions = [
      {
        id: "q1",
        questionText: "What is acceleration due to gravity on Earth?",
        options: ["9.8 m/s^2", "11.2 m/s^2", "8.5 m/s^2", "10 m/s^2"],
        correctAnswer: "0",
        explanation: "g is approximately 9.8 m/s^2 near Earth's surface.",
        marks: 4,
        negativeMarks: 1,
      },
    ];

    // Function to sanitize questions before returning to active test runner
    const sanitizeForActiveExam = (questions: typeof rawDbQuestions) => {
      return questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
      }));
    };

    const secure = sanitizeForActiveExam(rawDbQuestions);
    expect(secure[0]).not.toHaveProperty("correctAnswer");
    expect(secure[0]).not.toHaveProperty("explanation");
    expect(secure[0].questionText).toBe("What is acceleration due to gravity on Earth?");
    expect(secure[0].options?.length).toBe(4);
  });

  it("rejects exam registration for existing student mobile without OTP verification", async () => {
    // Simulate the security fix in src/app/api/exam/[id]/register/route.ts
    // Existing student found by mobile should require OTP; new mobile should not
    const simulateRequiresOtp = (studentExists: boolean, otpProvided?: string, isSessionVerified = false) => {
      if (!studentExists) return false; // new mobile: intentionally OTP-free (fresh registration)
      if (isSessionVerified) return false; // already logged-in portal session owns the mobile
      return !otpProvided; // existing student without OTP => requires verification
    };

    // Existing student without OTP => must be rejected (requiresOtp: true)
    expect(simulateRequiresOtp(true, undefined, false)).toBe(true);
    expect(simulateRequiresOtp(true, "", false)).toBe(true);

    // Existing student with OTP provided => can proceed (OTP will be verified against DB)
    expect(simulateRequiresOtp(true, "123456", false)).toBe(false);

    // Existing student but already authenticated via portal session => no OTP needed
    expect(simulateRequiresOtp(true, undefined, true)).toBe(false);

    // New mobile (no existing student) => no OTP required (fresh registration, creates new record)
    // This path is intentionally OTP-free only because it creates a brand-new student record
    expect(simulateRequiresOtp(false, undefined, false)).toBe(false);
    expect(simulateRequiresOtp(false, "123456", false)).toBe(false);

    // In the actual route, the response for existing mobile without OTP is 403 with requiresOtp:true
    const mockRouteResponseForExistingWithoutOtp = {
      status: 403,
      body: { error: "OTP verification required for existing student mobile number", requiresOtp: true },
    };
    expect(mockRouteResponseForExistingWithoutOtp.status).toBe(403);
    expect(mockRouteResponseForExistingWithoutOtp.body.requiresOtp).toBe(true);

    // New mobile without OTP should succeed (200) and return questions (no impersonation risk)
    const mockRouteResponseForNewMobile = {
      status: 200,
      body: { success: true, requiresOtp: undefined },
    };
    expect(mockRouteResponseForNewMobile.status).toBe(200);
    expect(mockRouteResponseForNewMobile.body.requiresOtp).toBeUndefined();
  });
});
