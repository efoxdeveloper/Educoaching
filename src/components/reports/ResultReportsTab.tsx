"use client";

import { useState, useMemo } from "react";
import {
  Award,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  GraduationCap,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { formatDate, initials } from "@/lib/utils";
import { exportToCsv } from "@/lib/export-csv";
import type { ReportsData } from "@/lib/reports-data";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export function ResultReportsTab({ data }: { data: ReportsData }) {
  const { resultReport } = data;
  const [subView, setSubView] = useState<"overview" | "ledger">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [testFilter, setTestFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Filtered test overview
  const filteredTests = useMemo(() => {
    return resultReport.tests.filter((t) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchSubject = t.subject.toLowerCase().includes(q);
        const matchBatch = t.batchName.toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchBatch) return false;
      }
      return true;
    });
  }, [resultReport.tests, searchTerm]);

  // Filtered results ledger
  const filteredLedger = useMemo(() => {
    return resultReport.resultsLedger.filter((r) => {
      if (testFilter !== "ALL" && r.testTitle !== testFilter) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = r.studentName.toLowerCase().includes(q);
        const matchTitle = r.testTitle.toLowerCase().includes(q);
        const matchSubject = r.subject.toLowerCase().includes(q);
        const matchBatch = r.batchName.toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchSubject && !matchBatch) return false;
      }

      return true;
    });
  }, [resultReport.resultsLedger, testFilter, statusFilter, searchTerm]);

  // Handle Export CSV
  const handleExportCsv = () => {
    if (subView === "overview") {
      const headers = [
        "Test ID",
        "Test Title",
        "Subject",
        "Batch",
        "Course",
        "Test Date",
        "Total Marks",
        "Passing Marks",
        "Evaluated Count",
        "Present Count",
        "Absent Count",
        "Passed Count",
        "Failed Count",
        "Average Score",
        "Highest Score",
        "Pass Rate (%)",
      ];
      const rows = filteredTests.map((t) => [
        t.testId,
        t.title,
        t.subject,
        t.batchName,
        t.courseName,
        formatDate(t.testDate),
        t.totalMarks,
        t.passingMarks,
        t.evaluatedCount,
        t.presentCount,
        t.absentCount,
        t.passedCount,
        t.failedCount,
        t.averageScore,
        t.highestScore,
        `${t.passRate}%`,
      ]);
      exportToCsv("tests_performance_overview_report", headers, rows);
    } else {
      const headers = [
        "Result ID",
        "Student Name",
        "Test Title",
        "Subject",
        "Batch",
        "Course",
        "Test Date",
        "Marks Obtained",
        "Total Marks",
        "Percentage (%)",
        "Result Status",
        "Remarks",
      ];
      const rows = filteredLedger.map((r) => [
        r.resultId,
        r.studentName,
        r.testTitle,
        r.subject,
        r.batchName,
        r.courseName,
        formatDate(r.testDate),
        r.marksObtained !== null ? r.marksObtained : "ABSENT",
        r.totalMarks,
        r.percentage !== null ? `${r.percentage}%` : "N/A",
        r.status,
        r.remarks || "",
      ]);
      exportToCsv("student_test_results_ledger", headers, rows);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Result KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-full min-w-0">
        <KpiCard
          label="Tests Conducted"
          value={resultReport.kpis.totalTests.toString()}
          icon={Award}
          accent="scholar"
        />
        <KpiCard
          label="Overall Pass Rate"
          value={`${resultReport.kpis.overallPassRate}%`}
          icon={CheckCircle2}
          accent="scholar"
          trend={`${resultReport.kpis.totalEvaluations} evaluated submissions`}
          trendTone="success"
        />
        <KpiCard
          label="Institute Average Score"
          value={`${resultReport.kpis.instituteAverageScore}%`}
          icon={TrendingUp}
          accent="marigold"
        />
        <KpiCard
          label="Highest Score Overall"
          value={`${resultReport.kpis.highestMarkOverall} pts`}
          icon={GraduationCap}
          accent="marigold"
          trend={`${resultReport.kpis.totalAbsent} absent across tests`}
          trendTone="neutral"
        />
      </div>

      {/* Chart: Pass Rate per Test */}
      {resultReport.tests.length > 0 && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Test Pass Rate & Average Scores</h3>
              <p className="text-xs text-scholar-400">Comparing pass rates and average scores across exams</p>
            </div>
            <span className="text-xs font-semibold text-scholar-600">
              Avg Pass: {resultReport.kpis.overallPassRate}%
            </span>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={resultReport.tests.slice(0, 8).map((t) => ({
                name: t.title.length > 14 ? t.title.slice(0, 14) + "..." : t.title,
                fullName: t.title,
                passRate: t.passRate,
                avgScorePct: Math.round((t.averageScore / t.totalMarks) * 100),
              }))}
              margin={{ left: -10, right: 10, top: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "#4E6E93" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 }}
                formatter={(val, name) => [
                  `${val}%`,
                  name === "passRate" ? "Pass Rate" : "Average Score %",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Bar dataKey="passRate" name="Pass Rate %" fill="#2E7D52" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="avgScorePct" name="Avg Score %" fill="#E8A33D" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Sub-view Selector & Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex rounded-xl bg-scholar-50 p-1 border border-scholar-100 self-start">
            <button
              onClick={() => setSubView("overview")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                subView === "overview"
                  ? "bg-white text-scholar-900 shadow-sm"
                  : "text-scholar-600 hover:text-scholar-900"
              }`}
            >
              Tests Overview ({resultReport.tests.length})
            </button>
            <button
              onClick={() => setSubView("ledger")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                subView === "ledger"
                  ? "bg-white text-scholar-900 shadow-sm"
                  : "text-scholar-600 hover:text-scholar-900"
              }`}
            >
              Student Score Ledger ({resultReport.resultsLedger.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {subView === "ledger" && (
              <>
                <select
                  value={testFilter}
                  onChange={(e) => setTestFilter(e.target.value)}
                  className="rounded-xl border border-scholar-100 bg-white px-3 py-2 text-xs font-medium text-scholar-700 focus:border-scholar-500 focus:outline-none"
                >
                  <option value="ALL">All Tests</option>
                  {resultReport.tests.map((t) => (
                    <option key={t.testId} value={t.title}>
                      {t.title} ({t.batchName})
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-scholar-100 bg-white px-3 py-2 text-xs font-medium text-scholar-700 focus:border-scholar-500 focus:outline-none"
                >
                  <option value="ALL">All Results</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                  <option value="ABSENT">Absent</option>
                </select>
              </>
            )}

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-scholar-700 transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-scholar-400" />
          <input
            type="text"
            placeholder={
              subView === "overview"
                ? "Search tests by title, subject, or batch..."
                : "Search score ledger by student name, test title, or subject..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-scholar-100 bg-white py-2 pl-9 pr-4 text-sm text-ink placeholder:text-scholar-300 focus:border-scholar-500 focus:outline-none"
          />
        </div>
      </Card>

      {/* Subview 1: Tests Overview Table */}
      {subView === "overview" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Test Title & Subject</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-center">Marks (Total/Pass)</th>
                  <th className="px-4 py-3 font-semibold text-center">Evaluated</th>
                  <th className="px-4 py-3 font-semibold text-center">Avg Score</th>
                  <th className="px-4 py-3 font-semibold text-center">High Score</th>
                  <th className="px-4 py-3 font-semibold text-right">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-scholar-50">
                {filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-scholar-400">
                      No tests found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTests.map((t) => (
                    <tr key={t.testId} className="hover:bg-scholar-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{t.title}</p>
                        <p className="text-[11px] text-scholar-400">{t.subject}</p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{t.batchName}</p>
                        <p className="text-[11px] text-scholar-400">{t.courseName}</p>
                      </td>

                      <td className="px-4 py-3 text-scholar-600 whitespace-nowrap">
                        {formatDate(t.testDate)}
                      </td>

                      <td className="px-4 py-3 text-center tabular-nums text-ink">
                        <span className="font-semibold">{t.totalMarks}</span>
                        <span className="text-[10px] text-scholar-400"> / {t.passingMarks} pass</span>
                      </td>

                      <td className="px-4 py-3 text-center tabular-nums">
                        <span className="font-semibold text-ink">{t.evaluatedCount}</span>
                        <span className="text-[10px] text-scholar-400 block">
                          {t.presentCount} pres / {t.absentCount} abs
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center font-semibold text-scholar-700 tabular-nums">
                        {t.averageScore}
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-marigold-700 tabular-nums">
                        {t.highestScore}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            t.passRate >= 70
                              ? "bg-success-50 text-success-700"
                              : "bg-warn-50 text-warn-700"
                          }`}
                        >
                          {t.passRate}% ({t.passedCount}/{t.presentCount})
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Subview 2: Student Score Ledger Table */}
      {subView === "ledger" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Test Title & Subject</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold text-center">Marks Obtained</th>
                  <th className="px-4 py-3 font-semibold text-center">Percentage</th>
                  <th className="px-4 py-3 font-semibold">Result Status</th>
                  <th className="px-4 py-3 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-scholar-50">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-scholar-400">
                      No score records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((r) => (
                    <tr key={r.resultId} className="hover:bg-scholar-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-scholar-100 text-xs font-semibold text-scholar-700">
                            {initials(r.studentName)}
                          </div>
                          <div>
                            <p className="font-semibold text-ink">{r.studentName}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{r.testTitle}</p>
                        <p className="text-[11px] text-scholar-400">{r.subject}</p>
                      </td>

                      <td className="px-4 py-3 text-scholar-600">
                        {r.batchName}
                      </td>

                      <td className="px-4 py-3 text-center font-display font-semibold text-ink tabular-nums">
                        {r.marksObtained !== null ? (
                          <span>
                            {r.marksObtained} <span className="text-scholar-400 font-normal">/ {r.totalMarks}</span>
                          </span>
                        ) : (
                          <span className="text-scholar-400 font-normal">ABSENT</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center tabular-nums">
                        {r.percentage !== null ? (
                          <span className="font-bold text-ink">{r.percentage}%</span>
                        ) : (
                          <span className="text-scholar-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {r.status === "PASSED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-bold text-success-700">
                            <CheckCircle2 size={11} /> PASSED
                          </span>
                        ) : r.status === "FAILED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-[11px] font-bold text-danger-700">
                            <XCircle size={11} /> FAILED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-scholar-100 px-2 py-0.5 text-[11px] font-semibold text-scholar-600">
                            <AlertCircle size={11} /> ABSENT
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-scholar-500 max-w-xs truncate">
                        {r.remarks || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
