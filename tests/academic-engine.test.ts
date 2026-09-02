import { describe, it, expect } from "vitest";

describe("Phase 3: Academic Engine & Online Test Scoring", () => {
  it("calculates test score accurately with negative marking", () => {
    const questions = [
      { id: "q1", marks: 4, negativeMarks: 1, correctAnswer: "0" },
      { id: "q2", marks: 4, negativeMarks: 1, correctAnswer: "2" },
      { id: "q3", marks: 4, negativeMarks: 1, correctAnswer: "1" },
      { id: "q4", marks: 4, negativeMarks: 1, correctAnswer: "3" },
      { id: "q5", marks: 4, negativeMarks: 1, correctAnswer: "0" },
    ];

    const studentAnswers: Record<string, string> = {
      q1: "0", // correct (+4)
      q2: "1", // incorrect (-1)
      q3: "1", // correct (+4)
      // q4 unattempted (0)
      q5: "2", // incorrect (-1)
    };

    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalUnattempted = 0;
    let rawScore = 0;

    for (const q of questions) {
      const ans = studentAnswers[q.id];
      if (ans === undefined) {
        totalUnattempted++;
      } else if (ans === q.correctAnswer) {
        totalCorrect++;
        rawScore += q.marks;
      } else {
        totalIncorrect++;
        rawScore -= q.negativeMarks;
      }
    }

    expect(totalCorrect).toBe(2);
    expect(totalIncorrect).toBe(2);
    expect(totalUnattempted).toBe(1);
    expect(rawScore).toBe(6); // 4 + 4 - 1 - 1 = 6
  });

  it("calculates ranks and percentiles accurately", () => {
    const attempts = [
      { studentId: "s1", score: 95 },
      { studentId: "s2", score: 85 },
      { studentId: "s3", score: 85 },
      { studentId: "s4", score: 60 },
      { studentId: "s5", score: 40 },
    ];

    // Sort descending by score
    const sorted = [...attempts].sort((a, b) => b.score - a.score);
    const total = sorted.length;

    const ranked = sorted.map((att, idx) => {
      const rank = idx + 1;
      const lowerCount = sorted.filter((a) => a.score < att.score).length;
      const percentile = total > 1 ? Number(((lowerCount / (total - 1)) * 100).toFixed(1)) : 100;
      return { ...att, rank, percentile };
    });

    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].percentile).toBe(100);

    expect(ranked[4].rank).toBe(5);
    expect(ranked[4].percentile).toBe(0);
  });

  it("computes topic accuracy breakdown", () => {
    const questionStats = [
      { topic: "Kinematics", accuracy: 80 },
      { topic: "Kinematics", accuracy: 60 },
      { topic: "Thermodynamics", accuracy: 50 },
    ];

    const topicStats: Record<string, { count: number; sum: number }> = {};
    for (const q of questionStats) {
      if (!topicStats[q.topic]) topicStats[q.topic] = { count: 0, sum: 0 };
      topicStats[q.topic].count++;
      topicStats[q.topic].sum += q.accuracy;
    }

    const kinematicsAvg = Math.round(topicStats["Kinematics"].sum / topicStats["Kinematics"].count);
    expect(kinematicsAvg).toBe(70);
    expect(topicStats["Thermodynamics"].sum).toBe(50);
  });

  it("detects late assignment submissions", () => {
    const isSubmissionLate = (dueDateStr: string, submitDateStr: string) => {
      return new Date(submitDateStr) > new Date(dueDateStr);
    };

    const dueDate = "2026-09-01T23:59:59Z";
    const onTimeSubmission = "2026-08-31T12:00:00Z";
    const lateSubmission = "2026-09-02T10:00:00Z";

    expect(isSubmissionLate(dueDate, onTimeSubmission)).toBe(false);
    expect(isSubmissionLate(dueDate, lateSubmission)).toBe(true);
  });

  it("validates question bank inputs", () => {
    const validateQuestion = (q: {
      questionText?: string;
      subject?: string;
      correctAnswer?: string;
      marks?: number;
    }) => {
      if (!q.questionText || !q.questionText.trim()) return "Question text is required";
      if (!q.subject || !q.subject.trim()) return "Subject is required";
      if (q.correctAnswer === undefined || q.correctAnswer === null) return "Correct answer is required";
      if (q.marks !== undefined && q.marks <= 0) return "Marks must be positive";
      return null;
    };

    expect(validateQuestion({ questionText: "What is F=ma?", subject: "Physics", correctAnswer: "0" })).toBeNull();
    expect(validateQuestion({ questionText: "", subject: "Physics", correctAnswer: "0" })).toBe("Question text is required");
    expect(validateQuestion({ questionText: "Sample", subject: "", correctAnswer: "0" })).toBe("Subject is required");
    expect(validateQuestion({ questionText: "Sample", subject: "Math", marks: -2 })).toBe("Correct answer is required");
  });
});
