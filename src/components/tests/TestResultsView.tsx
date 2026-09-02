"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  BarChart2,
  CheckCircle,
  FileSpreadsheet,
  Medal,
  Printer,
  TrendingUp,
  Users,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MarksEntryModal } from "./MarksEntryModal";
import { cn } from "@/lib/utils";

type TestDetail = {
  id: string;
  title: string;
  subject: string | null;
  testDate: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  totalMarks: number;
  passingMarks: number | null;
  description: string | null;
  batchId: string;
  batchName: string;
  courseName: string;
};

type Analytics = {
  totalEnrolled: number;
  appearedCount: number;
  absentCount: number;
  unrecordedCount: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  highestScore: number | null;
  lowestScore: number | null;
  averageScore: number | null;
  averagePercentage: number | null;
  topScorer: string | null;
  distribution: { range: string; count: number }[];
};

type StudentResult = {
  studentId: string;
  studentName: string;
  mobile: string;
  marksObtained: number | null;
  isAbsent: boolean;
  hasRecord: boolean;
  remarks: string | null;
  rank: number | null;
  percentage: number | null;
  status: "PASSED" | "FAILED" | "ABSENT" | "UNRECORDED";
};

export function TestResultsView({
  testId,
  onBack,
}: {
  testId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<TestDetail | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/tests/${testId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load test report");
        return res.json();
      })
      .then((data) => {
        setTest(data.test);
        setAnalytics(data.analytics);
        setStudents(data.students);
      })
      .catch((err) => setError(err.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-scholar-200 border-t-scholar-600" />
          <p className="mt-3 text-xs font-medium text-scholar-400">Loading test results & performance...</p>
        </div>
      </div>
    );
  }

  if (error || !test || !analytics) {
    return (
      <div className="rounded-2xl border border-scholar-100 bg-white p-8 text-center">
        <AlertTriangle className="mx-auto text-warn-500" size={36} />
        <p className="mt-2 text-sm font-semibold text-ink">Failed to load test results</p>
        <p className="mt-1 text-xs text-scholar-400">{error || "Test not found"}</p>
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft size={14} /> Back to Tests
        </button>
      </div>
    );
  }

  // Filter students
  const filteredStudents = students.filter((s) => {
    if (filterStatus === "ALL") return true;
    return s.status === filterStatus;
  });

  const chartColors = ["#1F9D66", "#2F507A", "#4E6E93", "#E8A33D", "#D64545"];

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-semibold text-scholar-600 transition-colors hover:bg-scholar-50"
        >
          <ArrowLeft size={14} /> Back to All Tests
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2 text-xs font-semibold text-scholar-700 transition-colors hover:bg-scholar-50 print:hidden"
          >
            <Printer size={14} /> Print Report
          </button>
          <button
            onClick={() => setEntryModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-scholar-700 print:hidden"
          >
            <FileSpreadsheet size={14} /> Edit Marks
          </button>
        </div>
      </div>

      {/* Test Overview Banner */}
      <div className="rounded-2xl border border-scholar-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-xl font-bold text-ink">{test.title}</h1>
              {test.subject && (
                <Badge tone="marigold">{test.subject}</Badge>
              )}
              <span className="rounded-full bg-scholar-50 px-2.5 py-0.5 text-xs font-medium text-scholar-600 border border-scholar-100">
                {test.batchName} ({test.courseName})
              </span>
            </div>
            <p className="mt-1 text-xs text-scholar-400 flex flex-wrap items-center gap-2">
              <span>
                Conducted on:{" "}
                <strong className="text-scholar-600">
                  {new Date(test.testDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </strong>
              </span>
              {(test.startTime || test.endTime) && (
                <span className="inline-flex items-center gap-1 rounded bg-scholar-100/80 px-2 py-0.5 font-semibold text-scholar-700">
                  <Clock size={11} className="text-scholar-500" />
                  {(() => {
                    if (!test.startTime) return null;
                    const s = new Date(test.startTime);
                    if (isNaN(s.getTime())) return null;
                    const sStr = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                    if (!test.endTime) return `${sStr} onwards`;
                    const e = new Date(test.endTime);
                    const eStr = !isNaN(e.getTime()) ? e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
                    return eStr ? `${sStr} - ${eStr}` : sStr;
                  })()}
                </span>
              )}
              {test.description && <span>• {test.description}</span>}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-scholar-50 px-4 py-2 text-center border border-scholar-100">
              <p className="text-[10px] uppercase font-semibold text-scholar-400">Total Marks</p>
              <p className="font-display text-lg font-bold text-scholar-800">{test.totalMarks}</p>
            </div>
            {test.passingMarks && (
              <div className="rounded-xl bg-scholar-50 px-4 py-2 text-center border border-scholar-100">
                <p className="text-[10px] uppercase font-semibold text-scholar-400">Passing Marks</p>
                <p className="font-display text-lg font-bold text-scholar-800">{test.passingMarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {/* Total Appeared */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-scholar-400">Appeared</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-50 text-scholar-600">
              <Users size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-xl font-bold text-ink">
            {analytics.appearedCount} <span className="text-xs font-normal text-scholar-400">/ {analytics.totalEnrolled}</span>
          </p>
          <p className="mt-1 text-[11px] text-scholar-400">
            {analytics.absentCount} Absent • {analytics.unrecordedCount} Unrecorded
          </p>
        </Card>

        {/* Highest Score */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-scholar-400">Highest Score</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-marigold-50 text-marigold-600">
              <Medal size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-xl font-bold text-ink">
            {analytics.highestScore !== null ? (
              <>
                {analytics.highestScore}{" "}
                <span className="text-xs font-normal text-scholar-400">
                  ({Math.round(((analytics.highestScore / test.totalMarks) * 100) * 10) / 10}%)
                </span>
              </>
            ) : (
              "—"
            )}
          </p>
          <p className="mt-1 truncate text-[11px] font-medium text-marigold-600">
            {analytics.topScorer ? `🏆 ${analytics.topScorer}` : "No marks yet"}
          </p>
        </Card>

        {/* Average Score */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-scholar-400">Class Average</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-50 text-scholar-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-xl font-bold text-ink">
            {analytics.averageScore !== null ? (
              <>
                {analytics.averageScore}{" "}
                <span className="text-xs font-normal text-scholar-400">
                  ({analytics.averagePercentage}%)
                </span>
              </>
            ) : (
              "—"
            )}
          </p>
          <p className="mt-1 text-[11px] text-scholar-400">
            Lowest: {analytics.lowestScore ?? "—"}
          </p>
        </Card>

        {/* Pass Percentage */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-scholar-400">Pass Rate</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-50 text-success-600">
              <CheckCircle size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-xl font-bold text-success-600">
            {analytics.appearedCount > 0 ? `${analytics.passPercentage}%` : "—"}
          </p>
          <p className="mt-1 text-[11px] text-scholar-400">
            {analytics.passedCount} Passed • {analytics.failedCount} Failed
          </p>
        </Card>

        {/* Performance Grade */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-scholar-400">Batch Health</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-50 text-scholar-600">
              <Award size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-xl font-bold text-ink">
            {analytics.passPercentage >= 75
              ? "Excellent"
              : analytics.passPercentage >= 50
              ? "Moderate"
              : analytics.appearedCount > 0
              ? "Needs Focus"
              : "Pending"}
          </p>
          <p className="mt-1 text-[11px] text-scholar-400">
            Based on {analytics.appearedCount} evaluations
          </p>
        </Card>
      </div>

      {/* Analytics Chart & Performance Breakdown */}
      {analytics.appearedCount > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Distribution Chart */}
          <Card className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-ink">
                  Marks Distribution
                </h3>
                <p className="text-xs text-scholar-400">Number of students by score range</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-scholar-500 font-medium">
                <BarChart2 size={15} /> Score Breakdown
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.distribution}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                  <XAxis
                    dataKey="range"
                    stroke="#7E9BBC"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#D6E0EB" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="#7E9BBC"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#F7F5F0" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-scholar-100 bg-white p-2.5 shadow-popover">
                          <p className="text-xs font-semibold text-ink">{item.range}</p>
                          <p className="text-xs text-scholar-500">
                            Students: <strong>{item.count}</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {analytics.distribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Quick Summary Card */}
          <Card className="flex flex-col justify-between p-5">
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">Result Summary</h3>
              <p className="text-xs text-scholar-400">Class performance breakdown</p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-medium">
                    <span className="text-scholar-600">Passed Students</span>
                    <span className="text-success-600 font-semibold">
                      {analytics.passedCount} ({analytics.passPercentage}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-scholar-100">
                    <div
                      className="h-full bg-success-500 transition-all duration-500"
                      style={{ width: `${analytics.passPercentage}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium">
                    <span className="text-scholar-600">Failed Students</span>
                    <span className="text-danger-600 font-semibold">
                      {analytics.failedCount} (
                      {analytics.appearedCount > 0
                        ? 100 - analytics.passPercentage
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-scholar-100">
                    <div
                      className="h-full bg-danger-500 transition-all duration-500"
                      style={{
                        width: `${
                          analytics.appearedCount > 0
                            ? 100 - analytics.passPercentage
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-scholar-50 p-3 text-xs text-scholar-600 border border-scholar-100">
              <p className="font-medium text-ink">💡 Performance Insight</p>
              <p className="mt-1 text-[11px] leading-relaxed text-scholar-500">
                {analytics.passPercentage >= 80
                  ? "Outstanding results! Majority of the batch is performing above expectations."
                  : analytics.passPercentage >= 60
                  ? "Good overall performance. A few students could benefit from revision sessions."
                  : "Needs attention. Recommend scheduling a doubt-clearing session for struggling topics."}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Student Rank & Result Leaderboard */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">
              Ranked Leaderboard
            </h3>
            <p className="text-xs text-scholar-400">
              Individual student rankings, percentages, and teacher remarks
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 rounded-xl bg-scholar-50 p-1 border border-scholar-100 text-xs">
            {[
              { id: "ALL", label: "All Students" },
              { id: "PASSED", label: "Passed" },
              { id: "FAILED", label: "Failed" },
              { id: "ABSENT", label: "Absent" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-medium transition-colors",
                  filterStatus === tab.id
                    ? "bg-white text-scholar-700 shadow-xs font-semibold"
                    : "text-scholar-400 hover:text-ink"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-scholar-100 text-scholar-400">
                <th className="pb-3 font-medium">Rank</th>
                <th className="pb-3 font-medium">Student Name</th>
                <th className="pb-3 font-medium">Mobile</th>
                <th className="pb-3 font-medium">Marks Obtained</th>
                <th className="pb-3 font-medium">Percentage</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-scholar-50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-scholar-400">
                    No student results match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const isTop3 = st.rank && st.rank <= 3;
                  return (
                    <tr
                      key={st.studentId}
                      className={cn(
                        "transition-colors hover:bg-scholar-50/50",
                        st.rank === 1 && "bg-marigold-50/20"
                      )}
                    >
                      {/* Rank badge */}
                      <td className="py-3">
                        {st.rank === 1 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-marigold-100 px-2.5 py-0.5 font-display text-xs font-bold text-marigold-700 border border-marigold-300 shadow-xs">
                            🥇 Rank 1
                          </span>
                        ) : st.rank === 2 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-display text-xs font-bold text-slate-700 border border-slate-300">
                            🥈 Rank 2
                          </span>
                        ) : st.rank === 3 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-display text-xs font-bold text-amber-800 border border-amber-300">
                            🥉 Rank 3
                          </span>
                        ) : st.rank !== null ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-scholar-50 font-display text-xs font-medium text-scholar-600 border border-scholar-200">
                            {st.rank}
                          </span>
                        ) : (
                          <span className="text-scholar-300">—</span>
                        )}
                      </td>

                      {/* Name */}
                      <td className="py-3 font-medium">
                        <span className={cn("text-ink", isTop3 && "font-bold text-scholar-800")}>
                          {st.studentName}
                        </span>
                      </td>

                      {/* Mobile */}
                      <td className="py-3 text-scholar-400 font-mono">{st.mobile}</td>

                      {/* Marks */}
                      <td className="py-3 font-semibold text-ink">
                        {st.isAbsent ? (
                          <span className="text-scholar-400 font-normal">Absent</span>
                        ) : st.marksObtained !== null ? (
                          <span>
                            {st.marksObtained}{" "}
                            <span className="text-scholar-400 font-normal">
                              / {test.totalMarks}
                            </span>
                          </span>
                        ) : (
                          <span className="text-scholar-400 font-normal">Not entered</span>
                        )}
                      </td>

                      {/* Percentage & Mini bar */}
                      <td className="py-3">
                        {st.percentage !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-scholar-700 min-w-[40px]">
                              {st.percentage}%
                            </span>
                            <div className="hidden sm:block h-1.5 w-16 overflow-hidden rounded-full bg-scholar-100">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  st.status === "PASSED" ? "bg-success-500" : "bg-danger-500"
                                )}
                                style={{ width: `${Math.min(st.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-scholar-300">—</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3">
                        {st.status === "PASSED" ? (
                          <Badge tone="success" dot>
                            Passed
                          </Badge>
                        ) : st.status === "FAILED" ? (
                          <Badge tone="danger" dot>
                            Failed
                          </Badge>
                        ) : st.status === "ABSENT" ? (
                          <Badge tone="neutral">Absent</Badge>
                        ) : (
                          <Badge tone="warn">Unrecorded</Badge>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-3 text-scholar-500 italic max-w-[200px] truncate">
                        {st.remarks || <span className="text-scholar-300 not-italic">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Marks Entry Modal */}
      {entryModalOpen && (
        <MarksEntryModal
          open={entryModalOpen}
          onClose={() => setEntryModalOpen(false)}
          testId={test.id}
          onSaved={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
