import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const test = await prisma.test.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
    include: {
      batch: { select: { id: true, name: true, course: { select: { name: true } } } },
      questions: {
        include: { question: true },
        orderBy: { order: "asc" },
      },
      attempts: {
        where: { status: "SUBMITTED" },
        include: { student: { select: { id: true, name: true, mobile: true } } },
        orderBy: { rank: "asc" },
      },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const attempts = test.attempts;
  const totalAttempts = attempts.length;

  const scores = attempts.map((a) => a.score || 0);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
  const avgScore =
    scores.length > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
      : 0;

  // Topic-wise accuracy & question performance
  const questionPerformance = test.questions.map((tq) => {
    const q = tq.question;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    attempts.forEach((att) => {
      const answers = (att.answers || {}) as Record<string, string>;
      const choice = answers[q.id];

      if (choice === undefined || choice === null || choice === "") {
        unattemptedCount++;
      } else if (String(choice).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const accuracyRate =
      totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

    return {
      questionId: q.id,
      order: tq.order,
      section: tq.section,
      topic: q.topic || "General",
      difficulty: q.difficulty,
      accuracyRate,
      correctCount,
      incorrectCount,
      unattemptedCount,
    };
  });

  // Topic aggregated accuracy
  const topicStats: Record<string, { totalQuestions: number; accuracySum: number }> = {};
  questionPerformance.forEach((qp) => {
    if (!topicStats[qp.topic]) {
      topicStats[qp.topic] = { totalQuestions: 0, accuracySum: 0 };
    }
    topicStats[qp.topic].totalQuestions++;
    topicStats[qp.topic].accuracySum += qp.accuracyRate;
  });

  const topicBreakdown = Object.entries(topicStats).map(([topic, stats]) => ({
    topic,
    questionCount: stats.totalQuestions,
    averageAccuracy: Math.round(stats.accuracySum / stats.totalQuestions),
  }));

  // Leaderboard
  const leaderboard = attempts.map((att) => ({
    rank: att.rank,
    studentId: att.student.id,
    studentName: att.student.name,
    mobile: att.student.mobile,
    score: att.score,
    percentile: att.percentile,
    correctCount: att.totalCorrect,
    incorrectCount: att.totalIncorrect,
    unattemptedCount: att.totalUnattempted,
    timeSpentSeconds: att.timeSpentSeconds,
    submittedAt: att.submittedAt,
  }));

  return NextResponse.json({
    test: {
      id: test.id,
      title: test.title,
      subject: test.subject,
      totalMarks: test.totalMarks,
      durationMinutes: test.durationMinutes,
      seriesName: test.seriesName,
      batchName: test.batch.name,
      courseName: test.batch.course?.name,
    },
    overview: {
      totalAttempts,
      highestScore,
      lowestScore,
      avgScore,
    },
    leaderboard,
    questionPerformance,
    topicBreakdown,
  });
}
