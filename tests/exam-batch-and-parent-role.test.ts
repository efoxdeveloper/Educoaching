import { describe, it, expect, vi } from "vitest";
import { GET, POST } from "@/app/api/tests/[id]/attempt/route";
import { prisma } from "@/lib/prisma";
import * as tenantModule from "@/lib/tenant";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    test: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    student: {
      findFirst: vi.fn(),
    },
    studentTestAttempt: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    testResult: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireInstitute: vi.fn(),
}));

describe("4 & 6 — Online Exam Batch Security and Parent Role Restrictions", () => {
  const instituteId = "inst-1";
  const testId = "test-1";
  const batchA = "batch-A";
  const batchB = "batch-B";

  const sampleTest = {
    id: testId,
    instituteId,
    batchId: batchA,
    title: "Physics Mock 1",
    subject: "Physics",
    durationMinutes: 60,
    totalMarks: 100,
    negativeMarks: 1,
    marksPerQuestion: 4,
    batch: { id: batchA, name: "Batch A" },
    questions: [
      {
        question: {
          id: "q1",
          subject: "Physics",
          questionText: "What is velocity?",
          options: ["Speed with direction", "Mass", "Force", "Time"],
          correctAnswer: "Speed with direction",
          marks: 4,
          negativeMarks: 1,
        },
      },
    ],
  };

  it("rejects attempt start if student is in Batch B for an exam made for Batch A", async () => {
    vi.mocked(tenantModule.requireInstitute).mockResolvedValue({
      instituteId,
      session: { user: { role: "STUDENT", id: "user-student" } },
    } as any);

    vi.mocked(prisma.test.findFirst).mockResolvedValue(sampleTest as any);
    vi.mocked(prisma.student.findFirst).mockResolvedValue({
      id: "student-1",
      instituteId,
      batchId: batchB, // different batch!
    } as any);

    const req = new Request(`http://localhost/api/tests/${testId}/attempt?studentId=student-1`);
    const res = await GET(req, { params: { id: testId } });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Student is not enrolled in the batch for this exam");
  });

  it("rejects a PARENT from starting an uncompleted exam attempt", async () => {
    vi.mocked(tenantModule.requireInstitute).mockResolvedValue({
      instituteId,
      session: { user: { role: "PARENT", id: "parent-1" } },
    } as any);

    vi.mocked(prisma.test.findFirst).mockResolvedValue(sampleTest as any);
    vi.mocked(prisma.student.findFirst).mockResolvedValue({
      id: "student-1",
      instituteId,
      batchId: batchA,
    } as any);
    vi.mocked(prisma.studentTestAttempt.findUnique).mockResolvedValue(null);

    const req = new Request(`http://localhost/api/tests/${testId}/attempt?studentId=student-1`);
    const res = await GET(req, { params: { id: testId } });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Parents cannot start or take online exams");
  });

  it("rejects a PARENT from submitting an exam attempt via POST", async () => {
    vi.mocked(tenantModule.requireInstitute).mockResolvedValue({
      instituteId,
      session: { user: { role: "PARENT", id: "parent-1" } },
    } as any);

    const req = new Request(`http://localhost/api/tests/${testId}/attempt`, {
      method: "POST",
      body: JSON.stringify({
        studentId: "student-1",
        answers: { q1: "Speed with direction" },
      }),
    });

    const res = await POST(req, { params: { id: testId } });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Parents cannot submit exam attempts");
  });

  it("allows a STUDENT in the correct batch to submit an exam attempt", async () => {
    vi.mocked(tenantModule.requireInstitute).mockResolvedValue({
      instituteId,
      session: { user: { role: "STUDENT", id: "student-1" } },
    } as any);

    vi.mocked(prisma.test.findFirst).mockResolvedValue(sampleTest as any);
    vi.mocked(prisma.student.findFirst).mockResolvedValue({
      id: "student-1",
      instituteId,
      batchId: batchA,
    } as any);

    vi.mocked(prisma.studentTestAttempt.upsert).mockResolvedValue({
      id: "att-1",
      testId,
      studentId: "student-1",
      score: 4,
      status: "SUBMITTED",
    } as any);

    vi.mocked(prisma.testResult.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.studentTestAttempt.findMany).mockResolvedValue([
      { id: "att-1", score: 4 },
    ] as any);
    vi.mocked(prisma.studentTestAttempt.update).mockResolvedValue({} as any);
    vi.mocked(prisma.studentTestAttempt.findUnique).mockResolvedValue({
      id: "att-1",
      score: 4,
      rank: 1,
      percentile: 100,
    } as any);

    const req = new Request(`http://localhost/api/tests/${testId}/attempt`, {
      method: "POST",
      body: JSON.stringify({
        studentId: "student-1",
        answers: { q1: "Speed with direction" },
        timeSpentSeconds: 120,
      }),
    });

    const res = await POST(req, { params: { id: testId } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.attempt.score).toBe(4);
  });
});
