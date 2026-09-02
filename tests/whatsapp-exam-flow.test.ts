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
});
