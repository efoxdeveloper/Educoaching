"use client";

import { useState, useMemo } from "react";
import {
  CalendarCheck,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { exportToCsv } from "@/lib/export-csv";
import { initials } from "@/lib/utils";
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

export function AttendanceReportsTab({ data }: { data: ReportsData }) {
  const { attendanceReport } = data;
  const [subView, setSubView] = useState<"students" | "daily">("students");
  const [searchTerm, setSearchTerm] = useState("");
  const [lowAttendanceOnly, setLowAttendanceOnly] = useState(false);

  // Filtered student attendance
  const filteredStudents = useMemo(() => {
    return attendanceReport.studentSummary.filter((s) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = s.studentName.toLowerCase().includes(q);
        const matchCourse = s.courseName.toLowerCase().includes(q);
        const matchBatch = s.batchName.toLowerCase().includes(q);
        if (!matchName && !matchCourse && !matchBatch) return false;
      }

      if (lowAttendanceOnly && !s.isLowAttendance) return false;

      return true;
    });
  }, [attendanceReport.studentSummary, searchTerm, lowAttendanceOnly]);

  // Handle Export CSV
  const handleExportCsv = () => {
    if (subView === "students") {
      const headers = [
        "Student ID",
        "Student Name",
        "Course",
        "Batch",
        "Total Classes Marked",
        "Classes Present",
        "Classes Absent",
        "Classes Late",
        "Attendance Rate (%)",
        "Attendance Status",
      ];
      const rows = filteredStudents.map((s) => [
        s.studentId,
        s.studentName,
        s.courseName,
        s.batchName,
        s.totalMarked,
        s.presentCount,
        s.absentCount,
        s.lateCount,
        `${s.attendanceRate}%`,
        s.isLowAttendance ? "LOW ATTENDANCE (<75%)" : "HEALTHY",
      ]);
      exportToCsv("student_attendance_summary_report", headers, rows);
    } else {
      const headers = [
        "Date",
        "Total Sessions Marked",
        "Present Count",
        "Absent Count",
        "Late Count",
        "Attendance Rate (%)",
      ];
      const rows = attendanceReport.dailyTrend.map((d) => [
        d.date,
        d.total,
        d.present,
        d.absent,
        d.late,
        `${d.rate}%`,
      ]);
      exportToCsv("daily_attendance_trend_report", headers, rows);
    }
  };

  const presentRate =
    attendanceReport.kpis.totalRecords > 0
      ? Math.round((attendanceReport.kpis.presentCount / attendanceReport.kpis.totalRecords) * 100)
      : 0;

  const absentRate =
    attendanceReport.kpis.totalRecords > 0
      ? Math.round((attendanceReport.kpis.absentCount / attendanceReport.kpis.totalRecords) * 100)
      : 0;

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Attendance KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-full min-w-0">
        <KpiCard
          label="Overall Attendance"
          value={`${attendanceReport.kpis.overallAttendanceRate}%`}
          icon={CalendarCheck}
          accent="scholar"
          trend={`${attendanceReport.kpis.totalRecords} attendance marks`}
          trendTone="neutral"
        />
        <KpiCard
          label="Present Rate"
          value={`${presentRate}%`}
          icon={CheckCircle2}
          accent="scholar"
          trend={`${attendanceReport.kpis.presentCount} present`}
          trendTone="success"
        />
        <KpiCard
          label="Absent Rate"
          value={`${absentRate}%`}
          icon={XCircle}
          accent="marigold"
          trend={`${attendanceReport.kpis.absentCount} absent marks`}
          trendTone={absentRate > 20 ? "danger" : "neutral"}
        />
        <KpiCard
          label="Students at Risk (<75%)"
          value={attendanceReport.kpis.lowAttendanceCount.toString()}
          icon={AlertTriangle}
          accent="marigold"
          trend={
            attendanceReport.kpis.lowAttendanceCount > 0
              ? "Require parent notifications"
              : "All students meeting attendance criteria"
          }
          trendTone={attendanceReport.kpis.lowAttendanceCount > 0 ? "danger" : "success"}
        />
      </div>

      {/* Daily Attendance Trend Bar Chart */}
      {attendanceReport.dailyTrend.filter((d) => d.total > 0).length > 0 && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Daily Attendance Breakdown</h3>
              <p className="text-xs text-scholar-400">Present vs Absent attendance counts across marked dates</p>
            </div>
            <span className="text-xs font-semibold text-scholar-600">
              Avg: {attendanceReport.kpis.overallAttendanceRate}%
            </span>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              data={attendanceReport.dailyTrend.filter((d) => d.total > 0)}
              margin={{ left: -20, right: 10, top: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 }}
                formatter={(val, name) => [
                  val,
                  name === "present" ? "Present" : name === "absent" ? "Absent" : "Late",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Bar dataKey="present" name="Present" fill="#2E7D52" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={28} />
              <Bar dataKey="late" name="Late" fill="#E8A33D" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={28} />
              <Bar dataKey="absent" name="Absent" fill="#C93B2B" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Sub-view Switcher & Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex rounded-xl bg-scholar-50 p-1 border border-scholar-100 self-start">
            <button
              onClick={() => setSubView("students")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                subView === "students"
                  ? "bg-white text-scholar-900 shadow-sm"
                  : "text-scholar-600 hover:text-scholar-900"
              }`}
            >
              Student Attendance Summary ({attendanceReport.studentSummary.length})
            </button>
            <button
              onClick={() => setSubView("daily")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                subView === "daily"
                  ? "bg-white text-scholar-900 shadow-sm"
                  : "text-scholar-600 hover:text-scholar-900"
              }`}
            >
              Daily Attendance Trend ({attendanceReport.dailyTrend.filter((d) => d.total > 0).length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {subView === "students" && (
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-scholar-100 bg-white px-3 py-2 text-xs font-medium text-scholar-700 select-none">
                <input
                  type="checkbox"
                  checked={lowAttendanceOnly}
                  onChange={(e) => setLowAttendanceOnly(e.target.checked)}
                  className="rounded border-scholar-300 text-danger-600 focus:ring-0"
                />
                <span className="text-danger-700 font-semibold">Low Attendance Only (&lt;75%)</span>
              </label>
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

        {subView === "students" && (
          <div className="mt-3 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-scholar-400" />
            <input
              type="text"
              placeholder="Search student attendance by student name, course, or batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-scholar-100 bg-white py-2 pl-9 pr-4 text-sm text-ink placeholder:text-scholar-300 focus:border-scholar-500 focus:outline-none"
            />
          </div>
        )}
      </Card>

      {/* Subview 1: Student-wise Attendance Table */}
      {subView === "students" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Course & Batch</th>
                  <th className="px-4 py-3 font-semibold text-center">Total Sessions</th>
                  <th className="px-4 py-3 font-semibold text-center">Present</th>
                  <th className="px-4 py-3 font-semibold text-center">Absent</th>
                  <th className="px-4 py-3 font-semibold text-center">Late</th>
                  <th className="px-4 py-3 font-semibold">Attendance Rate</th>
                  <th className="px-4 py-3 font-semibold">Risk Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-scholar-50">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-scholar-400">
                      No attendance records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.studentId} className="hover:bg-scholar-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                              s.isLowAttendance
                                ? "bg-danger-50 text-danger-700"
                                : "bg-scholar-100 text-scholar-700"
                            }`}
                          >
                            {initials(s.studentName)}
                          </div>
                          <div>
                            <p className="font-semibold text-ink">{s.studentName}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{s.courseName}</p>
                        <p className="text-[11px] text-scholar-400">{s.batchName}</p>
                      </td>

                      <td className="px-4 py-3 text-center font-medium text-ink tabular-nums">
                        {s.totalMarked}
                      </td>

                      <td className="px-4 py-3 text-center font-semibold text-success-700 tabular-nums">
                        {s.presentCount}
                      </td>

                      <td className="px-4 py-3 text-center font-semibold text-danger-600 tabular-nums">
                        {s.absentCount}
                      </td>

                      <td className="px-4 py-3 text-center font-medium text-marigold-600 tabular-nums">
                        {s.lateCount}
                      </td>

                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold tabular-nums text-ink">{s.attendanceRate}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-scholar-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.isLowAttendance ? "bg-danger-500" : "bg-success-600"
                            }`}
                            style={{ width: `${Math.min(100, s.attendanceRate)}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {s.isLowAttendance ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 border border-danger-200 px-2 py-0.5 text-[11px] font-bold text-danger-700">
                            <AlertTriangle size={11} /> Low Attendance
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-700">
                            <CheckCircle2 size={11} /> Regular
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Subview 2: Daily Attendance Trend Table */}
      {subView === "daily" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-center">Sessions Marked</th>
                  <th className="px-4 py-3 font-semibold text-center">Present</th>
                  <th className="px-4 py-3 font-semibold text-center">Absent</th>
                  <th className="px-4 py-3 font-semibold text-center">Late</th>
                  <th className="px-4 py-3 font-semibold text-right">Daily Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-scholar-50">
                {attendanceReport.dailyTrend.filter((d) => d.total > 0).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-scholar-400">
                      No daily records found.
                    </td>
                  </tr>
                ) : (
                  attendanceReport.dailyTrend
                    .filter((d) => d.total > 0)
                    .map((d) => (
                      <tr key={d.date} className="hover:bg-scholar-50/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-ink">
                          {d.date}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-ink tabular-nums">
                          {d.total}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-success-700 tabular-nums">
                          {d.present}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-danger-600 tabular-nums">
                          {d.absent}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-marigold-600 tabular-nums">
                          {d.late}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              d.rate >= 75
                                ? "bg-success-50 text-success-700"
                                : "bg-danger-50 text-danger-700"
                            }`}
                          >
                            {d.rate}%
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
    </div>
  );
}
