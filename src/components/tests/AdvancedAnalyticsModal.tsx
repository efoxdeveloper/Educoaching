"use client";

import { useEffect, useState, useCallback } from "react";
import { Drawer } from "@/components/ui/Drawer";
import {
  Trophy,
  Target,
  BarChart3,
  Loader2,
} from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  studentId: string;
  studentName: string;
  mobile: string;
  score: number;
  percentile: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  timeSpentSeconds: number;
  submittedAt: string;
};

type TopicStat = {
  topic: string;
  questionCount: number;
  averageAccuracy: number;
};

type QuestionStat = {
  questionId: string;
  order: number;
  section: string | null;
  topic: string;
  difficulty: string;
  accuracyRate: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
};

export function AdvancedAnalyticsModal({
  open,
  onClose,
  testId,
  testTitle,
}: {
  open: boolean;
  onClose: () => void;
  testId: string;
  testTitle: string;
}) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<{
    totalAttempts: number;
    highestScore: number;
    lowestScore: number;
    avgScore: number;
  } | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [topicBreakdown, setTopicBreakdown] = useState<TopicStat[]>([]);
  const [questionPerformance, setQuestionPerformance] = useState<QuestionStat[]>([]);
  const [tab, setTab] = useState<"leaderboard" | "topics" | "questions">("leaderboard");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/${testId}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setOverview(data.overview);
        setLeaderboard(data.leaderboard || []);
        setTopicBreakdown(data.topicBreakdown || []);
        setQuestionPerformance(data.questionPerformance || []);
      }
    } catch {
      console.error("Failed to load test analytics");
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    if (open && testId) {
      fetchAnalytics();
    }
  }, [open, testId, fetchAnalytics]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Advanced Analytics: ${testTitle}`}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col h-full space-y-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-scholar-500" size={28} />
          </div>
        ) : !overview || overview.totalAttempts === 0 ? (
          <div className="rounded-2xl border border-dashed border-scholar-200 p-8 text-center text-xs text-scholar-400">
            No online test submissions recorded yet for this exam. Once students complete the online test, ranks, percentiles, and topic breakdowns will appear here.
          </div>
        ) : (
          <>
            {/* Top Stat Cards */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3 text-center">
                <span className="text-[11px] font-semibold text-scholar-500">Total Attempts</span>
                <p className="font-display text-lg font-bold text-ink">{overview.totalAttempts}</p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                <span className="text-[11px] font-semibold text-emerald-700">Highest Score</span>
                <p className="font-display text-lg font-bold text-emerald-600">
                  {overview.highestScore}
                </p>
              </div>

              <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3 text-center">
                <span className="text-[11px] font-semibold text-scholar-500">Average Score</span>
                <p className="font-display text-lg font-bold text-scholar-700">{overview.avgScore}</p>
              </div>

              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-center">
                <span className="text-[11px] font-semibold text-rose-700">Lowest Score</span>
                <p className="font-display text-lg font-bold text-rose-600">{overview.lowestScore}</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-scholar-100 pb-2">
              <button
                type="button"
                onClick={() => setTab("leaderboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  tab === "leaderboard"
                    ? "bg-scholar-600 text-white shadow-sm"
                    : "text-scholar-600 hover:bg-scholar-50"
                }`}
              >
                <Trophy size={13} />
                Student Ranks ({leaderboard.length})
              </button>

              <button
                type="button"
                onClick={() => setTab("topics")}
                className={`flex items-center gap-1.5 ml-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  tab === "topics"
                    ? "bg-scholar-600 text-white shadow-sm"
                    : "text-scholar-600 hover:bg-scholar-50"
                }`}
              >
                <Target size={13} />
                Topic-Wise Accuracy ({topicBreakdown.length})
              </button>

              <button
                type="button"
                onClick={() => setTab("questions")}
                className={`flex items-center gap-1.5 ml-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  tab === "questions"
                    ? "bg-scholar-600 text-white shadow-sm"
                    : "text-scholar-600 hover:bg-scholar-50"
                }`}
              >
                <BarChart3 size={13} />
                Item Analysis ({questionPerformance.length})
              </button>
            </div>

            {/* Tab 1: Leaderboard Table */}
            {tab === "leaderboard" && (
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {leaderboard.map((lb) => (
                  <div
                    key={lb.studentId}
                    className="flex items-center justify-between rounded-xl border border-scholar-100 bg-white p-3 text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                          lb.rank === 1
                            ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                            : lb.rank === 2
                            ? "bg-scholar-200 text-scholar-800"
                            : lb.rank === 3
                            ? "bg-amber-50 text-amber-700"
                            : "bg-scholar-50 text-scholar-600"
                        }`}
                      >
                        #{lb.rank}
                      </div>

                      <div>
                        <p className="font-semibold text-ink">{lb.studentName}</p>
                        <p className="text-[10px] text-scholar-500">
                          {lb.correctCount} Correct • {lb.incorrectCount} Incorrect •{" "}
                          {lb.unattemptedCount} Skipped
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-display text-sm font-bold text-scholar-700">
                        {lb.score} pts
                      </p>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {lb.percentile}%ile
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Topic Accuracy Breakdown */}
            {tab === "topics" && (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {topicBreakdown.map((tb) => (
                  <div
                    key={tb.topic}
                    className="rounded-xl border border-scholar-100 bg-white p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">{tb.topic}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-scholar-400 font-medium">
                          {tb.questionCount} question{tb.questionCount === 1 ? "" : "s"}
                        </span>
                        <span className="font-bold text-scholar-700">{tb.averageAccuracy}%</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-scholar-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          tb.averageAccuracy >= 70
                            ? "bg-emerald-500"
                            : tb.averageAccuracy >= 40
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${tb.averageAccuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Question Item Analysis */}
            {tab === "questions" && (
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {questionPerformance.map((qp) => (
                  <div
                    key={qp.questionId}
                    className="flex items-center justify-between rounded-xl border border-scholar-100 bg-white p-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-scholar-700">Q{qp.order}.</span>
                      <div>
                        <p className="font-semibold text-ink">{qp.topic}</p>
                        <span className="text-[10px] rounded bg-scholar-100 px-1 font-semibold text-scholar-600">
                          {qp.difficulty}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-[11px]">
                        <span className="text-emerald-700 font-semibold">{qp.correctCount}✔</span>{" "}
                        <span className="text-rose-700 font-semibold">{qp.incorrectCount}✘</span>{" "}
                        <span className="text-scholar-400">{qp.unattemptedCount}ø</span>
                      </div>
                      <span
                        className={`rounded-lg px-2 py-1 font-bold text-xs ${
                          qp.accuracyRate >= 70
                            ? "bg-emerald-100 text-emerald-800"
                            : qp.accuracyRate >= 40
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {qp.accuracyRate}% Accuracy
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
